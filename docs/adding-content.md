# Adding and editing content

Everything a visitor reads lives in `content/`. You should never need to
touch a component to update your life.

## Your one-liners: `content/site.ts`

Typed object — a typo in a field name is a build error. Fields:

| Field          | Where it appears |
| -------------- | ---------------- |
| `name`         | header, metadata title |
| `url`          | sitemap/robots/metadata base (set this when the domain is real) |
| `tagline`      | the hero line, one line, gets the diffusion reveal (no subtitle under it) |
| `about`        | array of About-section paragraphs |
| `learningHref` | destination of the "check out what i'm learning →" link (opens in a new tab) |
| `contact`      | Contact-section invitation copy; the email renders beneath it |
| `email`        | Contact section — **plain text** (`sfangcmd [at] gmail [dot] com`), deliberately not a mailto |
| `tag`          | footer easter egg — keep the `> tag: … [0.98]` model-readout voice |
| `nav`          | header links — in-page anchors (`#about` `#experience` `#projects` `#contact`) |
| `socials`      | footer links (GitHub, LinkedIn — resume intentionally omitted) |
| `experience`   | static timeline: array of `{ period, company, role, blurb }` |

### Editing the experience timeline

`experience` is a plain array in `site.ts` — no MDX, no detail pages. Each
entry renders as `company · role` on the left and the mono `period` on the
right, newest first (array order). The `blurb` field is authored but **not
rendered** — the timeline is deliberately bare for calm; re-enable by passing
`blurb={e.blurb}` to `TimelineRow` in `app/page.tsx`.

## Adding a project

Projects still use the MDX pipeline (this is the "hybrid" model: the
homepage experience timeline is static data, but projects keep real
`/work/<slug>` case-study pages). Create `content/work/<slug>.mdx` — the
filename is the URL. It automatically appears in the **projects** section,
gets a static page, and lands in the sitemap. Frontmatter schema:

```mdx
---
title: Project name          # required — row title + page h1
year: 2026                   # required — sort helper + fallback period
period: Jan 2026 – Jun 2026  # mono date range shown on the row/page (falls back to year)
blurb: six-word description  # required — grey text after the title
order: 1                     # required — projects sort, ascending
link: https://example.com    # optional — external link on the page
---

Body in Markdown/MDX. Keep case studies in the shape:
**context → what I did → outcome.**
```

Style notes for case-study bodies (`.prose` styles in `globals.css`
cover `p`, `h2`, `ul`, `a`, `code`):

- Write for two readers at once: technical depth for engineers, product
  judgment for PM interviewers.
- YouTube/Google work stays at a public-safe altitude — describe the
  problem shape and scale, never internals.
- Images: use the `BlurThumb` component (diffusion-style resolve) once
  thumbnails exist; put files in `public/`.

To remove a project from the homepage, delete its file (or park it
outside `content/work/`). To reorder, edit `order`.

## Adding photos (B side)

Photos are data too: a folder of originals plus one CSV, and a script that
turns them into the manifest the pages read. You never touch a component.

1. Export from Lightroom as JPEG, long edge ~2400px, into a folder per
   series under `photos/` (`photos/portraits/`, `photos/sports/`, ...;
   gitignored, originals stay on your machine). Flat files directly in
   `photos/` still work. Keep filenames unique across folders: the filename
   is the photo's id.
2. Run `npm run photos -- --scaffold` to get a CSV row for every new file
   (series from the folder, title guessed from the filename), then fill in
   the words in `content/photos.csv`:

   | column   | meaning |
   | -------- | ------- |
   | `file`   | filename in `photos/` — must match exactly (case included); `.jpg`, `.jpeg` or `.png` |
   | `title`  | shown in italics under the image |
   | `place`  | shown after the title |
   | `year`   | integer; gallery sorts newest first |
   | `series` | one of the `slug`s in `content/series.ts`; blank = the folder name |
   | `home`   | `TRUE` to include on the home streams (aim for 30–40); `TRUE`/`FALSE`, `1`/`0`, `yes`/`no`, any case |
   | `order`  | integer sequence on the home, lower first; blank when `home` is FALSE |
   | `alt`    | one plain sentence describing the image, for screen readers and search |
   | `rank`   | optional: position within its series in the gallery, lower first. Blank ranks sort after ranked ones, then by filename in natural order, so numbering files `01-`, `02-` is enough |

   If `title`/`alt` are blank the script falls back to the image's embedded
   IPTC/XMP Title and Caption, so captioning in Lightroom also works. If
   there is no embedded text either, `title` becomes the filename
   ("last-train_02" → "Last train 02") and `alt` becomes the title. The
   run summary lists every row that used a fallback.
3. Run `npm run photos`. It is strict: a row without a file, a file without
   a row, a duplicate `file`, an unknown `series`, or a non-integer `year`/
   `order` is an error, not a warning. It prints every problem at once and
   writes nothing. On success it writes renditions at 480/960/1600px wide
   (AVIF + JPEG, never upscaled) to `public/photos/<id>-<width>.*` and the
   manifest to `content/photos.json`; commit both. `<id>` is the filename
   stem slugified (`Tiny Pic_01.JPG` → `tiny-pic-01`), so two files that
   differ only by case or punctuation are an error.

   Re-runs are incremental: a photo is skipped when all its outputs are
   newer than the original. `npm run photos -- --force` regenerates
   everything. Outputs in `public/photos/` for ids no longer in the CSV are
   deleted and listed. The manifest is always rewritten, in a stable order
   (series order, then year desc, then title), so diffs stay clean.
4. Commit and push. The site is static, so that's the deploy.

To add a series, add an entry to `content/series.ts`. To take a photo down,
delete its row (and optionally the original) and re-run the script.

The rows currently in `photos.csv` are placeholders for synthetic sample
images (`sample-01..04.jpg`), generated locally during development; the
committed `photos.json` is `[]` until real originals go through the script.

## Adding a notes/blog section (future)

The pattern is already established: copy the `work` pipeline —
`content/notes/*.mdx`, a loader in `lib/content.ts`, and
`app/notes/[slug]/page.tsx` mirroring `app/work/[slug]/page.tsx`. Add a
`{ label: "notes", href: "/notes" }` entry to `site.nav` when it exists.

## Static files

`public/` (create it when first needed): images, OG assets, etc. Note: a
served resume was **deliberately removed** for privacy — don't re-add
`public/resume.pdf` or a `socials` entry for it without checking with Sean.

## Current state (as of 2026-07-05)

- `tagline`, `about`, `contact`, `tag` are real (workshopped July 2026).
- Both project case studies (seangpt, studii) are written and accurate.
- `learningHref` points at the `obiKnowledge` Obsidian repo; SeanGPT is the
  RAG interface over those same notes (the two are intentionally linked).
- `experience` blurbs are authored but not rendered (see above).
- Still TODO: verify `site.url` domain, favicon (planned "S-patch" = initial
  in a patch cell) + OG images, then deploy.
