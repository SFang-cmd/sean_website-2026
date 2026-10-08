/**
 * npm run photos [--force]
 *
 * The B-side photo pipeline. Reads content/photos.csv and the originals in
 * photos/, writes optimized renditions to public/photos/ and the manifest to
 * content/photos.json. The manifest shape is the `Photo` interface in
 * lib/photos.ts (the contract the /photo pages build against); this script
 * must keep producing exactly that.
 *
 * Strict by design: any mismatch between the CSV and the folder, or a bad
 * cell, is an error. Every problem is printed and the script exits 1 before
 * writing anything. See docs/adding-content.md → "Adding photos".
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseCsv } from "csv-parse/sync";
import exifr from "exifr";
import sharp, { type Sharp } from "sharp";
import { series } from "../content/series";
import type { Photo, Rendition } from "../lib/photos";

// ---------------------------------------------------------------------------
// Config

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = path.join(ROOT, "content", "photos.csv");
const MANIFEST_PATH = path.join(ROOT, "content", "photos.json");
const ORIGINALS_DIR = path.join(ROOT, "photos");
const OUTPUT_DIR = path.join(ROOT, "public", "photos");
/** Site-relative prefix for rendition paths in the manifest. */
const PUBLIC_PREFIX = "/photos";

const WIDTHS = [480, 960, 1600] as const;
const AVIF_QUALITY = 55;
const JPEG_QUALITY = 78;
const BLUR_WIDTH = 20;
const BLUR_QUALITY = 50;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
const IGNORED_FILES = new Set(["readme.md"]);
const CSV_COLUMNS = ["file", "title", "place", "year", "series", "home", "order", "alt"] as const;

const CONCURRENCY = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));

// ---------------------------------------------------------------------------
// Types

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

interface Entry {
  id: string;
  file: string;
  sourcePath: string;
  title: string;
  place: string;
  year: number;
  series: string;
  home: boolean;
  order: number | null;
  alt: string;
  /** Which fields came from somewhere other than the CSV, for the summary. */
  fallbacks: string[];
}

interface Built {
  photo: Photo;
  regenerated: boolean;
}

// ---------------------------------------------------------------------------
// Helpers

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");

if (args.has("--help") || args.has("-h")) {
  console.log(
    [
      "usage: npm run photos [-- --force]",
      "",
      "Reads content/photos.csv + photos/, writes public/photos/ and content/photos.json.",
      "  --force   regenerate every rendition even if outputs are up to date",
    ].join("\n"),
  );
  process.exit(0);
}

/** Filename stem → stable id: lowercase, a-z0-9 and single hyphens. */
function slugify(stem: string): string {
  return stem
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Filename stem → readable title: "sunset_over-LA" → "Sunset over LA". */
function humanize(stem: string): string {
  const words = stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : stem;
}

function parseBool(raw: string): boolean | undefined {
  const v = raw.trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n", ""].includes(v)) return false;
  return undefined;
}

function parseInteger(raw: string): number | undefined {
  const v = raw.trim();
  return /^-?\d+$/.test(v) ? Number(v) : undefined;
}

/** XMP/IPTC values may be strings, `{ value, lang }` objects, or arrays. */
function metaString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return metaString(value[0]);
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    return metaString(o.value ?? o["x-default"] ?? Object.values(o)[0]);
  }
  return String(value).trim();
}

/** Embedded IPTC/XMP title + caption, or empty strings when absent. */
async function embeddedText(sourcePath: string): Promise<{ title: string; caption: string }> {
  try {
    const meta = (await exifr.parse(sourcePath, {
      tiff: false,
      exif: false,
      gps: false,
      interop: false,
      ifd1: false,
      icc: false,
      iptc: true,
      xmp: true,
      mergeOutput: true,
    })) as Record<string, unknown> | undefined;
    if (!meta) return { title: "", caption: "" };
    const title =
      metaString(meta.ObjectName) || metaString(meta.title) || metaString(meta.Headline);
    const caption = metaString(meta.Caption) || metaString(meta.description);
    return { title, caption };
  } catch {
    return { title: "", caption: "" };
  }
}

async function mtimeOf(p: string): Promise<number | null> {
  try {
    return (await fs.stat(p)).mtimeMs;
  } catch {
    return null;
  }
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

function fmtTable(rows: string[][]): string {
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => (r[c] ?? "").length)));
  return rows
    .map((r) => r.map((cell, c) => (cell ?? "").padEnd(widths[c])).join("  ").trimEnd())
    .join("\n");
}

// ---------------------------------------------------------------------------
// 1. Read + validate the CSV and the folder (no writes until this is clean)

async function readRows(errors: string[], warnings: string[]): Promise<CsvRow[]> {
  let text: string;
  try {
    text = await fs.readFile(CSV_PATH, "utf8");
  } catch {
    errors.push(`CSV not found: ${path.relative(ROOT, CSV_PATH)}`);
    return [];
  }

  let records: Record<string, string>[];
  try {
    records = parseCsv(text, {
      columns: true,
      bom: true,
      trim: true,
      skip_empty_lines: true,
    }) as Record<string, string>[];
  } catch (e) {
    errors.push(`CSV parse error: ${(e as Error).message}`);
    return [];
  }

  const headerLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const header = headerLine.split(",").map((h) => h.trim());
  for (const col of CSV_COLUMNS) {
    if (!header.includes(col)) errors.push(`CSV is missing the "${col}" column`);
  }
  for (const col of header) {
    if (!(CSV_COLUMNS as readonly string[]).includes(col)) {
      warnings.push(`CSV has an unknown column "${col}" (ignored)`);
    }
  }

  return records as CsvRow[];
}

async function listOriginals(errors: string[]): Promise<string[]> {
  let names: string[];
  try {
    names = await fs.readdir(ORIGINALS_DIR);
  } catch {
    errors.push(`originals folder not found: ${path.relative(ROOT, ORIGINALS_DIR)}/`);
    return [];
  }
  const files: string[] = [];
  for (const name of names.sort()) {
    if (name.startsWith(".") || IGNORED_FILES.has(name.toLowerCase())) continue;
    const stat = await fs.stat(path.join(ORIGINALS_DIR, name));
    if (!stat.isFile()) continue;
    if (!IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase())) {
      errors.push(`photos/${name}: not a JPEG/PNG (only .jpg, .jpeg, .png are accepted)`);
      continue;
    }
    files.push(name);
  }
  return files;
}

async function collectEntries(errors: string[], warnings: string[]): Promise<Entry[]> {
  const [rows, files] = await Promise.all([readRows(errors, warnings), listOriginals(errors)]);
  const seriesSlugs = new Set(series.map((s) => s.slug));
  const fileSet = new Set(files);
  const seenFiles = new Map<string, number>();
  const seenIds = new Map<string, string>();
  const entries: Entry[] = [];

  rows.forEach((row, i) => {
    const line = i + 2; // 1-based, after the header
    const where = `row ${line}`;
    const file = (row.file ?? "").trim();
    if (!file) {
      errors.push(`${where}: "file" is blank`);
      return;
    }
    const label = `${where} (${file})`;

    if (seenFiles.has(file)) {
      errors.push(`${label}: duplicate "file" (first seen on row ${seenFiles.get(file)})`);
      return;
    }
    seenFiles.set(file, line);

    if (!fileSet.has(file)) {
      errors.push(`${label}: no such file in photos/`);
    }

    const stem = file.replace(/\.[^.]+$/, "");
    const id = slugify(stem);
    if (!id) {
      errors.push(`${label}: filename produces an empty id`);
    } else if (seenIds.has(id)) {
      errors.push(`${label}: id "${id}" collides with ${seenIds.get(id)} (rename one of the files)`);
    } else {
      seenIds.set(id, file);
    }

    const year = parseInteger(row.year ?? "");
    if (year === undefined) errors.push(`${label}: "year" must be an integer, got "${row.year}"`);

    const ser = (row.series ?? "").trim();
    if (!seriesSlugs.has(ser)) {
      errors.push(
        `${label}: series "${ser}" is not in content/series.ts (${[...seriesSlugs].join(", ")})`,
      );
    }

    const home = parseBool(row.home ?? "");
    if (home === undefined) errors.push(`${label}: "home" must be TRUE/FALSE, got "${row.home}"`);

    const orderRaw = (row.order ?? "").trim();
    let order: number | null = null;
    if (orderRaw !== "") {
      const n = parseInteger(orderRaw);
      if (n === undefined) errors.push(`${label}: "order" must be an integer or blank, got "${orderRaw}"`);
      else order = n;
    }
    if (home === true && order === null) {
      warnings.push(`${label}: home is TRUE but "order" is blank (will sort after ordered photos)`);
    }

    entries.push({
      id,
      file,
      sourcePath: path.join(ORIGINALS_DIR, file),
      title: (row.title ?? "").trim(),
      place: (row.place ?? "").trim(),
      year: year ?? 0,
      series: ser,
      home: home ?? false,
      order,
      alt: (row.alt ?? "").trim(),
      fallbacks: [],
    });
  });

  for (const f of files) {
    if (!seenFiles.has(f)) errors.push(`photos/${f}: no row in content/photos.csv`);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 2. Fallbacks for blank title/alt

async function applyFallbacks(entry: Entry): Promise<void> {
  if (entry.title && entry.alt) return;
  const embedded = await embeddedText(entry.sourcePath);
  const stem = entry.file.replace(/\.[^.]+$/, "");

  if (!entry.title) {
    if (embedded.title) {
      entry.title = embedded.title;
      entry.fallbacks.push("title ← embedded");
    } else {
      entry.title = humanize(stem);
      entry.fallbacks.push("title ← filename");
    }
  }
  if (!entry.alt) {
    if (embedded.caption) {
      entry.alt = embedded.caption;
      entry.fallbacks.push("alt ← embedded");
    } else {
      entry.alt = entry.title;
      entry.fallbacks.push("alt ← title");
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Renditions + blur

function outputName(id: string, width: number, ext: "avif" | "jpg"): string {
  return `${id}-${width}.${ext}`;
}

/** Widths to render for an original of the given (oriented) width. */
function targetWidths(originalWidth: number): number[] {
  const fit = WIDTHS.filter((w) => w <= originalWidth);
  return fit.length ? [...fit] : [originalWidth];
}

async function writeAtomic(pipeline: Sharp, dest: string): Promise<void> {
  const tmp = `${dest}.tmp-${process.pid}`;
  try {
    await pipeline.toFile(tmp);
    await fs.rename(tmp, dest);
  } catch (e) {
    await fs.rm(tmp, { force: true });
    throw e;
  }
}

async function build(entry: Entry): Promise<Built> {
  const meta = await sharp(entry.sourcePath).metadata();
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  if (!width || !height) throw new Error(`${entry.file}: could not read image dimensions`);

  const widths = targetWidths(width);
  const outputs = widths.flatMap((w) => [
    path.join(OUTPUT_DIR, outputName(entry.id, w, "avif")),
    path.join(OUTPUT_DIR, outputName(entry.id, w, "jpg")),
  ]);

  let regenerated = false;
  let upToDate = !FORCE;
  if (upToDate) {
    const sourceMtime = (await mtimeOf(entry.sourcePath)) ?? Infinity;
    for (const out of outputs) {
      const m = await mtimeOf(out);
      if (m === null || m <= sourceMtime) {
        upToDate = false;
        break;
      }
    }
  }

  if (!upToDate) {
    regenerated = true;
    // One decode of the original, oriented once; every rendition clones it.
    const base = sharp(entry.sourcePath, { failOn: "error" }).rotate();
    for (const w of widths) {
      const resized = base.clone().resize({ width: w, withoutEnlargement: true });
      await writeAtomic(
        resized.clone().avif({ quality: AVIF_QUALITY, effort: 4 }),
        path.join(OUTPUT_DIR, outputName(entry.id, w, "avif")),
      );
      await writeAtomic(
        resized.clone().jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true }),
        path.join(OUTPUT_DIR, outputName(entry.id, w, "jpg")),
      );
    }
  }

  // The blur placeholder is derived from the smallest JPEG rendition so a
  // skipped photo yields byte-identical manifest output to a regenerated one
  // without decoding the full original.
  const smallestJpg = path.join(OUTPUT_DIR, outputName(entry.id, widths[0], "jpg"));
  const blurBuf = await sharp(smallestJpg)
    .resize({ width: BLUR_WIDTH })
    .jpeg({ quality: BLUR_QUALITY, mozjpeg: true })
    .toBuffer();
  const blur = `data:image/jpeg;base64,${blurBuf.toString("base64")}`;

  const renditions: Rendition[] = widths.map((w) => ({
    width: w,
    avif: `${PUBLIC_PREFIX}/${outputName(entry.id, w, "avif")}`,
    jpg: `${PUBLIC_PREFIX}/${outputName(entry.id, w, "jpg")}`,
  }));

  // Key order here is the manifest's key order; keep it matching lib/photos.ts.
  const photo: Photo = {
    id: entry.id,
    file: entry.file,
    width,
    height,
    renditions,
    blur,
    title: entry.title,
    place: entry.place,
    year: entry.year,
    series: entry.series,
    home: entry.home,
    order: entry.order,
    alt: entry.alt,
  };
  return { photo, regenerated };
}

// ---------------------------------------------------------------------------
// 4. Orphans

async function removeOrphans(photos: Photo[]): Promise<string[]> {
  const keep = new Set<string>();
  for (const p of photos) {
    for (const r of p.renditions) {
      keep.add(path.basename(r.avif));
      keep.add(path.basename(r.jpg));
    }
  }
  const removed: string[] = [];
  for (const name of await fs.readdir(OUTPUT_DIR)) {
    if (name.startsWith(".")) continue;
    if (keep.has(name)) continue;
    const full = path.join(OUTPUT_DIR, name);
    if (!(await fs.stat(full)).isFile()) continue;
    await fs.rm(full);
    removed.push(name);
  }
  return removed.sort();
}

// ---------------------------------------------------------------------------
// Main

async function main(): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const entries = await collectEntries(errors, warnings);

  if (errors.length) {
    console.error(`npm run photos: ${errors.length} problem${errors.length === 1 ? "" : "s"}, nothing written.\n`);
    for (const e of errors) console.error(`  error    ${e}`);
    for (const w of warnings) console.error(`  warning  ${w}`);
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await pool(entries, CONCURRENCY, applyFallbacks);
  const built = await pool(entries, CONCURRENCY, build);

  const seriesIndex = new Map(series.map((s, i) => [s.slug, i]));
  const photos = built
    .map((b) => b.photo)
    .sort(
      (a, b) =>
        seriesIndex.get(a.series)! - seriesIndex.get(b.series)! ||
        b.year - a.year ||
        a.title.localeCompare(b.title),
    );

  const removed = await removeOrphans(photos);
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(photos, null, 2) + "\n");

  // Summary
  const regenerated = built.filter((b) => b.regenerated).length;
  const skipped = built.length - regenerated;
  const onHome = photos.filter((p) => p.home).length;

  console.log(`npm run photos${FORCE ? " --force" : ""}\n`);
  console.log(
    fmtTable([
      ["photos", String(photos.length)],
      ["on home", String(onHome)],
      ...series.map((s) => [`  ${s.slug}`, String(photos.filter((p) => p.series === s.slug).length)]),
      ["regenerated", String(regenerated)],
      ["skipped (up to date)", String(skipped)],
      ["orphans removed", String(removed.length)],
    ]),
  );

  if (removed.length) {
    console.log("\nremoved from public/photos/:");
    for (const r of removed) console.log(`  ${r}`);
  }

  const withFallbacks = entries.filter((e) => e.fallbacks.length);
  if (withFallbacks.length) {
    console.log("\nfallbacks used:");
    for (const e of withFallbacks) console.log(`  ${e.file}: ${e.fallbacks.join(", ")}`);
  }

  if (warnings.length) {
    console.log("\nwarnings:");
    for (const w of warnings) console.log(`  ${w}`);
  }

  const fileCount = (await fs.readdir(OUTPUT_DIR)).filter((n) => !n.startsWith(".")).length;
  console.log(
    `\nwrote ${path.relative(ROOT, MANIFEST_PATH)} and ${path.relative(ROOT, OUTPUT_DIR)}/ (${fileCount} files)`,
  );
}

main().catch((e: unknown) => {
  console.error(`npm run photos: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
