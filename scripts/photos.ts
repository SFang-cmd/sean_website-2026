/**
 * npm run photos [--force] [--scaffold]
 *
 * The B-side photo pipeline. The folder is the organization:
 *
 *   photos/<series>/<shoot>/cover.jpg   ← the shoot's cover (the gallery card)
 *   photos/<series>/<shoot>/01.jpg ...  ← the rest, ordered by filename
 *   photos/<series>/single.jpg          ← a photo on its own = a one-photo shoot
 *   photos/_hold/...                    ← ignored entirely (staging for photos
 *                                          not yet cleared to publish)
 *   photos/home/01.jpg ...              ← the home page: any photos, in
 *                                          filename order; no CSV row needed
 *
 * content/shoots.csv has ONE ROW PER SHOOT (shoot, series, title, place,
 * year) — the only words you type. Photos inherit their shoot's title,
 * place and year; alt text is derived. Output: optimized renditions in
 * public/photos/ and the manifest content/photos.json, whose shape is the
 * `Photo` interface in lib/photos.ts (the contract the /photo pages build
 * against); this script must keep producing exactly that.
 *
 * Shoot folder names are kept as-is as the shoot key (e.g. 2026_05-EK) and
 * slugified only for the output ids/URLs (2026-05-ek-cover).
 *
 * Incremental: a photo is skipped when its renditions exist, are newer than
 * the original, and the original is the same file the last run recorded in
 * content/photos.build.json (size + mtime) — so a replaced original is
 * rebuilt even if the new file's timestamp is older. --force rebuilds all.
 *
 * Strict by design: a shoot folder without a row, a row without a folder, a
 * bad cell, two covers in one shoot — every problem is printed and the script
 * exits 1 before writing anything. See docs/adding-content.md → "Adding photos".
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
const CSV_PATH = path.join(ROOT, "content", "shoots.csv");
const MANIFEST_PATH = path.join(ROOT, "content", "photos.json");
/** Per-photo source signatures (size + mtime) from the last run, so a
    replaced original is rebuilt even when the new file's mtime is older
    than the renditions (Finder copies keep the source's timestamp). */
const BUILD_PATH = path.join(ROOT, "content", "photos.build.json");
const ORIGINALS_DIR = path.join(ROOT, "photos");
const OUTPUT_DIR = path.join(ROOT, "public", "photos");
/** Site-relative URL prefix of the renditions. */
const PUBLIC_PREFIX = "/photos";

const WIDTHS = [480, 960, 1600] as const;
/** Landscapes get one more: at fit in the lightbox they span the whole
    viewport (~1200 CSS px on a 13" laptop = 2400 device px), where 1600 is
    visibly upscaled. Portraits are narrower on screen and 1600 is enough. */
const LANDSCAPE_WIDTHS = [...WIDTHS, 2400] as const;
const AVIF_QUALITY = 55;
const JPEG_QUALITY = 78;
const BLUR_WIDTH = 20;
const BLUR_QUALITY = 50;

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
/** Non-image files allowed anywhere in photos/: docs and the private notes. */
const IGNORED_FILES = new Set(["readme.md", "notes.csv"]);
const CSV_COLUMNS = ["shoot", "series", "title", "place", "year"] as const;
/** Columns a CSV may leave out entirely (treated as blank). */
const OPTIONAL_COLUMNS = new Set<string>(["series", "place"]);
/** The home-page folder under photos/: not a series, no CSV rows. */
const HOME_DIR = "home";
/** `series` value of home-page photos in the manifest (never a gallery slug). */
const HOME_SERIES = "home";
/** Shoot folder names: letters, digits, hyphens, underscores (e.g. 2026_05-EK). */
const SLUG = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
/** A file named cover.jpg / cover-01.jpg (any case) is its shoot's cover. */
const COVER_STEM = /^cover(?:[-_].*)?$/i;

const CONCURRENCY = Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));

// ---------------------------------------------------------------------------
// Types

type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

/** One shoot folder (or loose single) as found on disk. */
interface ShootFolder {
  slug: string;
  series: string;
  /** Files relative to photos/, in natural filename order. */
  files: string[];
  /** True for a photo sitting directly in the series folder. */
  loose: boolean;
}

/** One photo, ready to build. */
interface Entry {
  id: string;
  file: string;
  sourcePath: string;
  title: string;
  place: string;
  year: number;
  series: string;
  /** Empty for home-page photos (they belong to no shoot). */
  shoot: string;
  /** Row index of the shoot in the CSV: gallery order within a series. */
  shootIndex: number;
  cover: boolean;
  rank: number;
  total: number;
}

interface Built {
  photo: Photo;
  regenerated: boolean;
  /** Source signature to record for the next run (see BUILD_PATH). */
  signature: string;
}

// ---------------------------------------------------------------------------
// CLI

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const SCAFFOLD = args.has("--scaffold");

if (args.has("--help") || args.has("-h")) {
  console.log(
    [
      "usage: npm run photos [-- --force | --scaffold]",
      "",
      "  photos/<series>/<shoot>/*.jpg → public/photos/ + content/photos.json",
      "",
      "  --force     regenerate every rendition even if outputs are up to date",
      "  --scaffold  append a row to content/shoots.csv for every shoot folder",
      "",
      "Home page: drop photos into photos/home/ (filename order). No row needed.",
      "              that has none (title guessed from the folder name), then stop",
    ].join("\n"),
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Helpers

function slugify(stem: string): string {
  return stem
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug or stem → readable title: "grad-2026-a" → "Grad 2026 a". */
function humanize(stem: string): string {
  const words = stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : stem;
}

/**
 * The year out of whatever a spreadsheet made of the cell: "2026", "2026-05",
 * "05-2026", "05/2026", "May-26", "May 2026", "May-2026". A two-digit year
 * is 20xx. Only the year is kept.
 */
function parseYear(raw: string): number | undefined {
  const t = raw.trim();
  let m = /^(?:(\d{4})(?:[-/ ]\d{1,2})?|\d{1,2}[-/ ](\d{4}))$/.exec(t);
  if (m) return Number(m[1] ?? m[2]);
  m = /^[A-Za-z]{3,9}[-/ ,]+(\d{2}|\d{4})$/.exec(t); // May-26, May 2026
  if (m) return m[1].length === 2 ? 2000 + Number(m[1]) : Number(m[1]);
  return undefined;
}

function parseInteger(raw: string): number | undefined {
  const v = raw.trim();
  return /^-?\d+$/.test(v) ? Number(v) : undefined;
}

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** "size-mtime" of a file: cheap, and different for any realistic edit. */
async function signatureOf(p: string): Promise<string> {
  const st = await fs.stat(p);
  return `${st.size}-${Math.round(st.mtimeMs)}`;
}

async function readBuildRecord(): Promise<Record<string, string> | null> {
  try {
    return JSON.parse(await fs.readFile(BUILD_PATH, "utf8")) as Record<string, string>;
  } catch {
    return null;
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

/** A CSV cell, quoted when needed. */
function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

// ---------------------------------------------------------------------------
// 1. Read + validate the CSV and the folder (no writes until this is clean)

async function readRows(errors: string[], warnings: string[]): Promise<CsvRow[]> {
  let text: string;
  try {
    // Spreadsheets save \r\n; normalise so appended rows can't mis-parse.
    text = (await fs.readFile(CSV_PATH, "utf8")).replace(/\r\n?/g, "\n");
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
    if (!header.includes(col) && !OPTIONAL_COLUMNS.has(col)) {
      errors.push(`CSV is missing the "${col}" column`);
    }
  }
  for (const col of header) {
    if (!(CSV_COLUMNS as readonly string[]).includes(col)) {
      warnings.push(`CSV has an unknown column "${col}" (ignored)`);
    }
  }

  return records as CsvRow[];
}

/**
 * Walk photos/: every series folder, every shoot folder inside it, every
 * image inside that. A loose image directly in a series folder is a
 * one-photo shoot named after the file.
 */
interface Folders {
  shoots: ShootFolder[];
  /** photos/home/* images, relative to photos/, in natural filename order. */
  home: string[];
}

async function listShootFolders(errors: string[]): Promise<Folders> {
  const out: ShootFolder[] = [];
  const home: string[] = [];
  const seriesSlugs = new Set(series.map((s) => s.slug));
  let top: string[];
  try {
    top = (await fs.readdir(ORIGINALS_DIR)).sort();
  } catch {
    errors.push(`originals folder not found: ${path.relative(ROOT, ORIGINALS_DIR)}/`);
    return { shoots: out, home };
  }
  const isImage = (name: string) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase());
  // Dotfiles, the private notes, and anything starting with "_" (a hold
  // area, e.g. photos/_hold/<series>/<shoot>/ for photos that aren't cleared
  // to publish yet: nothing under it is read, rendered, or committed).
  const skip = (name: string) =>
    name.startsWith(".") || name.startsWith("_") || IGNORED_FILES.has(name.toLowerCase());

  for (const ser of top) {
    if (skip(ser)) continue;
    const serDir = path.join(ORIGINALS_DIR, ser);
    if (!(await fs.stat(serDir)).isDirectory()) {
      if (isImage(ser)) errors.push(`photos/${ser}: put it in a series folder (photos/<series>/...)`);
      else errors.push(`photos/${ser}: unexpected file`);
      continue;
    }
    if (ser === HOME_DIR) {
      for (const name of (await fs.readdir(serDir)).sort(natural.compare)) {
        if (skip(name)) continue;
        const full = path.join(serDir, name);
        if ((await fs.stat(full)).isDirectory()) errors.push(`photos/${HOME_DIR}/${name}/: the home folder holds photos only, no subfolders`);
        else if (!isImage(name)) errors.push(`photos/${HOME_DIR}/${name}: not a JPEG/PNG`);
        else home.push(`${HOME_DIR}/${name}`);
      }
      continue;
    }
    if (!seriesSlugs.has(ser)) {
      errors.push(`photos/${ser}/: not a series in content/series.ts (${[...seriesSlugs].join(", ")}) — or "${HOME_DIR}" for the home page`);
      continue;
    }
    for (const name of (await fs.readdir(serDir)).sort(natural.compare)) {
      if (skip(name)) continue;
      const full = path.join(serDir, name);
      if ((await fs.stat(full)).isDirectory()) {
        const files: string[] = [];
        for (const f of (await fs.readdir(full)).sort(natural.compare)) {
          if (skip(f)) continue;
          const fp = path.join(full, f);
          if ((await fs.stat(fp)).isDirectory()) {
            errors.push(`photos/${ser}/${name}/${f}/: folders can't nest inside a shoot`);
          } else if (!isImage(f)) {
            errors.push(`photos/${ser}/${name}/${f}: not a JPEG/PNG`);
          } else {
            files.push(`${ser}/${name}/${f}`);
          }
        }
        if (!SLUG.test(name)) errors.push(`photos/${ser}/${name}/: shoot folder name may only use letters, digits, hyphens, underscores`);
        if (!files.length) errors.push(`photos/${ser}/${name}/: empty shoot folder`);
        out.push({ slug: name, series: ser, files, loose: false });
      } else if (isImage(name)) {
        const stem = name.replace(/\.[^.]+$/, "");
        out.push({ slug: slugify(stem), series: ser, files: [`${ser}/${name}`], loose: true });
      } else {
        errors.push(`photos/${ser}/${name}: not a JPEG/PNG`);
      }
    }
  }

  const seen = new Map<string, string>();
  for (const sh of out) {
    const prev = seen.get(sh.slug);
    if (prev) errors.push(`shoot "${sh.slug}" appears twice (${prev} and ${sh.series}); slugs must be unique across series`);
    seen.set(sh.slug, sh.series);
  }
  return { shoots: out, home };
}

async function collectEntries(errors: string[], warnings: string[]): Promise<Entry[]> {
  const [rows, { shoots: folders, home: homeFiles }] = await Promise.all([
    readRows(errors, warnings),
    listShootFolders(errors),
  ]);
  const folderBySlug = new Map(folders.map((f) => [f.slug, f]));
  const rowIndex = new Map<string, number>();
  const entries: Entry[] = [];
  const thisYear = new Date().getFullYear();

  rows.forEach((row, i) => {
    const line = i + 2; // 1-based, after the header
    const slug = (row.shoot ?? "").trim();
    const where = `row ${line}`;
    if (!slug) {
      errors.push(`${where}: "shoot" is blank`);
      return;
    }
    const label = `${where} (${slug})`;
    if (rowIndex.has(slug)) {
      errors.push(`${label}: duplicate shoot (first seen on row ${rowIndex.get(slug)! + 2})`);
      return;
    }
    rowIndex.set(slug, i);

    const folder = folderBySlug.get(slug);
    if (!folder) {
      errors.push(`${label}: no folder photos/<series>/${slug}/ (or loose file ${slug}.jpg)`);
      return;
    }
    const ser = (row.series ?? "").trim() || folder.series;
    if (ser !== folder.series) {
      errors.push(`${label}: series "${ser}" but the folder is under photos/${folder.series}/`);
    }

    let title = (row.title ?? "").trim();
    if (!title) {
      title = humanize(slug);
      warnings.push(`${label}: title blank; using "${title}"`);
    }
    const place = (row.place ?? "").trim();
    const yearRaw = (row.year ?? "").trim();
    let year = thisYear;
    if (yearRaw === "") warnings.push(`${label}: year blank; using ${thisYear}`);
    else {
      const y = parseYear(yearRaw);
      if (y === undefined) errors.push(`${label}: "year" must be a year (2026, 2026-05, 05-2026 or May-26), got "${yearRaw}"`);
      else year = y;
    }

    // Cover: cover.* if present (exactly one), else the first by filename.
    const stems = folder.files.map((f) => path.basename(f).replace(/\.[^.]+$/, ""));
    const coverIdx = stems.map((s, k) => (COVER_STEM.test(s) ? k : -1)).filter((k) => k >= 0);
    let coverAt = 0;
    if (coverIdx.length > 1) {
      errors.push(`${label}: ${coverIdx.length} files named cover* (${coverIdx.map((k) => stems[k]).join(", ")}); keep one`);
    } else if (coverIdx.length === 1) {
      coverAt = coverIdx[0];
    } else if (folder.files.length > 1) {
      warnings.push(`${label}: no cover.jpg; using ${path.basename(folder.files[0])}`);
    }

    const ids = new Set<string>();
    folder.files.forEach((file, k) => {
      const stem = stems[k];
      const id = folder.loose ? slugify(stem) : slugify(`${slug}-${stem}`);
      if (!id) errors.push(`${label}: ${file} produces an empty id`);
      if (ids.has(id)) errors.push(`${label}: ${file}: id "${id}" collides with another file in the shoot`);
      ids.add(id);
      entries.push({
        id,
        file,
        sourcePath: path.join(ORIGINALS_DIR, file),
        title,
        place,
        year,
        series: folder.series,
        shoot: slug,
        shootIndex: i,
        cover: k === coverAt,
        rank: k + 1,
        total: folder.files.length,
      });
    });
  });

  // Home page: every image in photos/home/, in filename order. No words —
  // the home shows images only, and the lightbox shows just the counter.
  // Year comes from EXIF (or this year) so the manifest stays well-formed.
  const homeIds = new Set<string>();
  for (const [k, file] of homeFiles.entries()) {
    const stem = path.basename(file).replace(/\.[^.]+$/, "");
    const id = slugify(`${HOME_SERIES}-${stem}`);
    if (homeIds.has(id)) errors.push(`photos/${file}: id "${id}" collides with another home photo`);
    homeIds.add(id);
    entries.push({
      id,
      file,
      sourcePath: path.join(ORIGINALS_DIR, file),
      title: "",
      place: "",
      year: (await exifYear(path.join(ORIGINALS_DIR, file))) ?? thisYear,
      series: HOME_SERIES,
      shoot: "",
      shootIndex: Number.MAX_SAFE_INTEGER,
      cover: false,
      rank: k + 1,
      total: homeFiles.length,
    });
  }

  for (const f of folders) {
    if (!rowIndex.has(f.slug)) {
      errors.push(
        f.loose
          ? `photos/${f.files[0]}: no row in content/shoots.csv (shoot "${f.slug}")`
          : `photos/${f.series}/${f.slug}/: no row in content/shoots.csv`,
      );
    }
  }

  // Ids must be unique across the whole site (they name the output files).
  const seenIds = new Map<string, string>();
  for (const e of entries) {
    const prev = seenIds.get(e.id);
    if (prev) errors.push(`id "${e.id}" from ${e.file} collides with ${prev}`);
    seenIds.set(e.id, e.file);
  }

  return entries;
}

// ---------------------------------------------------------------------------
// 2. Renditions + blur

function outputName(id: string, width: number, ext: "avif" | "jpg"): string {
  return `${id}-${width}.${ext}`;
}

/** Widths to render for an original of the given (oriented) size: the
    standard ladder, plus LANDSCAPE_WIDTHS' extra rung when wider than tall. */
function targetWidths(originalWidth: number, originalHeight: number): number[] {
  const ladder = originalWidth > originalHeight ? LANDSCAPE_WIDTHS : WIDTHS;
  const fit = ladder.filter((w) => w <= originalWidth);
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

function altFor(e: Entry): string {
  if (e.series === HOME_SERIES) return `Photo ${e.rank} of ${e.total}`;
  const where = [e.title, e.place, String(e.year)].filter(Boolean).join(", ");
  return e.total > 1 ? `${where} (${e.rank} of ${e.total})` : where;
}

/** Year of the capture date from EXIF, if the file has one. */
async function exifYear(file: string): Promise<number | undefined> {
  try {
    const x = (await exifr.parse(file, ["DateTimeOriginal"])) as { DateTimeOriginal?: Date } | undefined;
    const d = x?.DateTimeOriginal;
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getFullYear() : undefined;
  } catch {
    return undefined;
  }
}

/** `previous` is the last run's signatures, or null when there is no record
    yet (then only the mtime rule applies, so adopting the record does not
    force a full rebuild). */
async function build(entry: Entry, previous: Record<string, string> | null): Promise<Built> {
  const meta = await sharp(entry.sourcePath).metadata();
  const width = meta.autoOrient?.width ?? meta.width;
  const height = meta.autoOrient?.height ?? meta.height;
  if (!width || !height) throw new Error(`${entry.file}: could not read image dimensions`);

  const widths = targetWidths(width, height);
  const outputs = widths.flatMap((w) => [
    path.join(OUTPUT_DIR, outputName(entry.id, w, "avif")),
    path.join(OUTPUT_DIR, outputName(entry.id, w, "jpg")),
  ]);

  // Up to date = every output exists and is newer than the source, AND the
  // source is the same file the last run saw (its signature matches). The
  // signature check is what catches a replaced original with an older mtime.
  const signature = await signatureOf(entry.sourcePath);
  let regenerated = false;
  let upToDate = !FORCE && (previous === null || previous[entry.id] === signature);
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
    home: entry.series === HOME_SERIES,
    order: entry.series === HOME_SERIES ? entry.rank : null,
    rank: entry.series === HOME_SERIES ? null : entry.rank,
    shoot: entry.shoot || null,
    cover: entry.cover,
    alt: altFor(entry),
  };
  return { photo, regenerated, signature };
}

// ---------------------------------------------------------------------------
// 3. Orphans

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
// --scaffold

/**
 * For every shoot folder (or loose single) without a CSV row, append a row:
 * slug, series, a title guessed from the slug, blank place, this year, blank
 * home. The words are yours to fill in afterwards.
 */
async function scaffold(): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const [rows, { shoots: folders }] = await Promise.all([readRows(errors, warnings), listShootFolders(errors)]);
  const listed = new Set(rows.map((r) => (r.shoot ?? "").trim()));
  const missing = folders.filter((f) => !listed.has(f.slug));
  if (!missing.length) {
    console.log("npm run photos --scaffold: every shoot already has a row.");
    return;
  }
  const year = String(new Date().getFullYear());
  const lines = missing.map((f) => [f.slug, f.series, humanize(f.slug), "", year].map(csvCell).join(","));
  let text = "";
  try {
    text = (await fs.readFile(CSV_PATH, "utf8")).replace(/\r\n?/g, "\n");
  } catch {
    text = CSV_COLUMNS.join(",") + "\n";
  }
  if (!text.endsWith("\n")) text += "\n";
  await fs.writeFile(CSV_PATH, text + lines.join("\n") + "\n");
  console.log(`npm run photos --scaffold: added ${missing.length} row${missing.length === 1 ? "" : "s"} to content/shoots.csv:\n`);
  for (const f of missing) console.log(`  ${f.slug}  (${f.series}, ${f.files.length} photo${f.files.length === 1 ? "" : "s"})`);
  console.log("\nFill in title / place / year, and home (a position) for the shoots on the home page; then run npm run photos.");
}

// ---------------------------------------------------------------------------
// Main

async function main(): Promise<void> {
  if (SCAFFOLD) {
    await scaffold();
    return;
  }
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
  const previous = await readBuildRecord();
  const built = await pool(entries, CONCURRENCY, (e) => build(e, previous));

  // Manifest order = gallery order: series, then the shoot's row order in
  // the CSV, then position within the shoot (filename order).
  const seriesIndex = new Map(series.map((s, i) => [s.slug, i]));
  seriesIndex.set(HOME_SERIES, series.length); // after every gallery series
  const byId = new Map(entries.map((e) => [e.id, e]));
  const photos = built
    .map((b) => b.photo)
    .sort((a, b) => {
      const ea = byId.get(a.id)!;
      const eb = byId.get(b.id)!;
      return (
        seriesIndex.get(a.series)! - seriesIndex.get(b.series)! ||
        ea.shootIndex - eb.shootIndex ||
        ea.rank - eb.rank
      );
    });

  const removed = await removeOrphans(photos);
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(photos, null, 2) + "\n");
  const record = Object.fromEntries(
    built.map((b) => [b.photo.id, b.signature] as const).sort(([a], [b]) => a.localeCompare(b)),
  );
  await fs.writeFile(BUILD_PATH, JSON.stringify(record, null, 2) + "\n");

  // Summary
  const shoots = new Set(photos.map((p) => p.shoot));
  const regenerated = built.filter((b) => b.regenerated).length;
  const skipped = built.length - regenerated;
  const onHome = photos.filter((p) => p.home).length;

  console.log(`npm run photos${FORCE ? " --force" : ""}\n`);
  console.log(
    fmtTable([
      ["shoots", String(shoots.size)],
      ["photos", String(photos.length)],
      ["on home", String(onHome)],
      ...series.map((s) => {
        const ps = photos.filter((p) => p.series === s.slug);
        return [`  ${s.slug}`, `${new Set(ps.map((p) => p.shoot)).size} shoots, ${ps.length} photos`];
      }),
      ["regenerated", String(regenerated)],
      ["skipped (up to date)", String(skipped)],
      ["orphans removed", String(removed.length)],
    ]),
  );

  if (removed.length) {
    console.log("\nremoved from public/photos/:");
    for (const r of removed) console.log(`  ${r}`);
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
