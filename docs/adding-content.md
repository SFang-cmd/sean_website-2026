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

The folder is the organization. One CSV row per **shoot** is the only
writing. You never touch a component.

```
photos/                      ← gitignored; originals stay on your machine
  portraits/
    ek-2026-05/              ← one shoot = one session, one set of people
      cover.jpg              ← the cover (gallery card + home pick)
      01.jpg 02.jpg ...      ← the rest, shown in filename order
    headshot-01.jpg          ← a photo on its own = a one-photo shoot
  events/  sports/  travel/  aerial/
```

1. Export from Lightroom as JPEG, long edge ~2400px, into
   `photos/<series>/<shoot>/`. Shoot folder names are slugs (lowercase,
   hyphens) and are public (they appear in the manifest and image URLs), so
   use neutral ones: initials plus date (`ek-2026-05`) works. Name the cover
   `cover.jpg`; if there is none the first file by name is used. Who/what
   each shoot is can go in `photos/notes.csv`, which never ships.
2. Run `npm run photos -- --scaffold`: it appends a row to
   `content/shoots.csv` for every shoot folder that has none.
3. Fill in the row:

   | column   | meaning |
   | -------- | ------- |
   | `shoot`  | the folder name (written for you) |
   | `series` | the series folder (written for you) |
   | `title`  | what shows under the cover and in the lightbox, e.g. `Commencement` |
   | `place`  | e.g. `Penn, Philadelphia` |
   | `year`   | number |
   | `home`   | a position (1, 2, 3 …) to put the shoot's cover on the home streams, in that order; blank = not on the home |

   Photos inherit their shoot's title, place and year; alt text is derived
   (`Commencement, Penn, Philadelphia, 2026 (3 of 12)`). Gallery order within
   a series is the row order in the CSV, so reordering shoots is moving lines.
4. Run `npm run photos`. It is strict: a shoot folder without a row, a row
   without a folder, two `cover*` files in one shoot, or a bad cell stops it
   before anything is written. It writes `public/photos/` and
   `content/photos.json`; commit both. Re-runs only process changed images.

**How it shows up.** The gallery lists each shoot once, as its cover with a
photo count (the second frame peeks on hover); clicking opens the lightbox
over that shoot. One-photo shoots show as plain cells. On the home, each
shoot with a `home` position contributes its cover, and clicking a stream
image opens the whole shoot.

To add a series, add an entry to `content/series.ts` and create the folder.
To take a shoot down, remove its folder and its row, and re-run the script.

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
