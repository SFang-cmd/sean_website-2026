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
