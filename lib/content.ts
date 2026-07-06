import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface WorkMeta {
  slug: string;
  title: string;
  year: number;
  /** Human date range shown in the timeline (e.g. "May 2025 – Jul 2025"). */
  period: string;
  blurb: string;
  order: number;
  /** Optional external link (live site, repo, paper). */
  link?: string;
}

export interface WorkEntry {
  meta: WorkMeta;
  body: string;
}

const WORK_DIR = path.join(process.cwd(), "content", "work");

function parseWorkFile(file: string): WorkEntry {
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(WORK_DIR, file), "utf8");
  const { data, content } = matter(raw);
  return {
    meta: {
      slug,
      title: data.title,
      year: data.year,
      period: data.period ?? String(data.year),
      blurb: data.blurb,
      order: data.order ?? 99,
      link: data.link,
    },
    body: content,
  };
}

export function getAllWork(): WorkEntry[] {
  if (!fs.existsSync(WORK_DIR)) return [];
  return fs
    .readdirSync(WORK_DIR)
    .filter((f) => /\.mdx?$/.test(f))
    .map(parseWorkFile)
    .sort((a, b) => a.meta.order - b.meta.order);
}

export function getWork(slug: string): WorkEntry | undefined {
  return getAllWork().find((w) => w.meta.slug === slug);
}
