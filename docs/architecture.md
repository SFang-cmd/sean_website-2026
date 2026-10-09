# Architecture

## Principles

1. **Content is data, not code.** Everything a recruiter reads lives in
   `content/` — either the typed `site.ts` object or MDX files. Adding a
   project or changing the tagline never touches a component.
2. **Effects are leaves.** Each visual effect is one self-contained client
   component in `components/effects/` that imports only from `lib/` and
   `config/`. Any effect can be deleted or disabled without touching
   anything else.
3. **One source of patch math.** All grid geometry (cell size, snapping,
   cell enumeration for highlights) lives in `lib/grid.ts`. The backdrop,
   the link highlights, and the cursor tracker can never drift out of
   alignment because they share it.
4. **UI components are dumb.** `components/ui/` renders props into markup.
   No data fetching, no state beyond what an effect wrapper provides.

## Two sides

The site has two faces in one Next app:

- **A side** (`/`, `/work/*`): engineering, "the page as seen by a vision
  model". Patch grid, 648px column, Geist. Lives in the route group
  `app/(a)/` with its own layout.
- **B side** (`/photo`, `/photo/gallery`): photography, client-facing.
  Paper, no grid, no accent, Instrument Serif. Lives in `app/photo/` with
  its own layout, which scopes the B token set via the `.b` class.
  `photos.sean-fang.com` is a second address for it; `PHOTOS_HOST_MODE` in
  `lib/host.ts` decides: `"redirect"` (current) sends every request there to
  `sean-fang.com/photo/*` (307), so both doors stay in-app route changes;
  `"alias"` serves `/photo/*` in place via a host rewrite, B's links drop the
  prefix (`usePhotoBase`) and the door to A is a cross-origin load behind the
  shrink wave (`runShrinkWave`'s `hard` option). Canonical URLs and the
  sitemap follow the mode (`photoCanonicalBase`).

The root `app/layout.tsx` only sets fonts and metadata. Plan and decisions:
`docs/plan-two-sides.md`; visual prototypes: `docs/prototypes/`.

## Directory layout

```
config/theme.ts        design tokens + feature flags (see configuration.md)
content/site.ts        name, tagline, about, contact, email, tag, nav,
                       socials, experience[], photosUrl (all typed)
content/work/*.mdx     one file per project: frontmatter + case-study body
content/series.ts      B gallery sections: { slug, name, lede }[]
content/photos.csv     one row per photo (hand-edited; see adding-content.md)
content/photos.json    GENERATED photo manifest (npm run photos) — never hand-edit
photos/                photo originals, gitignored (input to npm run photos)
public/photos/         GENERATED renditions (avif/jpg per width), committed
scripts/photos.ts      the pipeline: csv + originals → manifest + renditions
lib/photos.ts          Photo type (the pipeline↔pages contract) + loaders
lib/grid.ts            CELL constant, snapToGrid(), cellsForRect()
lib/content.ts         reads/parses/sorts content/work MDX (gray-matter)
lib/a11y.ts            prefersReducedMotion()
lib/trackerStore.ts    cursor-tracker preference (localStorage-backed store)
lib/highlightStore.ts  link-highlighting preference (localStorage store)
lib/plainStore.ts      plaintext-mode master switch (localStorage store)
components/effects/    PatchGrid, PatchHighlight, DiffusionText,
                       CursorTracker, BlurThumb, VlmCaption
components/ui/         Nav, TimelineRow, Footer, EffectToggles,
                       TrackerToggle, HighlightToggle, PlainToggle
app/layout.tsx         fonts (Geist), metadata — nothing else
app/(a)/layout.tsx     A chrome: PatchGrid + CursorTracker, 648px column
app/(a)/page.tsx       single-page narrative: hero → about → experience →
                       projects → contact → footer
app/(a)/work/[slug]/   project case-study pages, statically generated from MDX
app/photo/layout.tsx   B chrome: `.b` token scope, Instrument Serif, full width
app/photo/page.tsx     B home (the streams)
app/photo/gallery/     B gallery (series index + grid)
app/globals.css        A tokens (light/dark), `.b` B tokens, Tailwind theme
                       bridge, smooth-scroll, .patch-link, .caret, .prose
app/sitemap.ts, robots.ts, icon.svg
```

## Data flow

```
content/site.ts  experience[]
  └─ app/page.tsx  → experience timeline (TimelineRow, unlinked rows)

content/work/*.mdx
  └─ lib/content.ts (gray-matter parse, sort by `order`)
       ├─ app/page.tsx            → projects timeline (TimelineRow → /work/<slug>)
       ├─ app/work/[slug]/page.tsx → generateStaticParams + MDXRemote body
       └─ app/sitemap.ts          → one URL per project
```

content/photos.csv + photos/*.jpg
  └─ scripts/photos.ts (npm run photos)
       ├─ public/photos/<id>-<w>.{avif,jpg}
       └─ content/photos.json
            └─ lib/photos.ts (getHomePhotos / getPhotosBySeries)
                 ├─ app/photo/page.tsx          → streams (home = true, by order)
                 ├─ app/photo/gallery/page.tsx  → grouped by content/series.ts
                 └─ app/sitemap.ts              → photos.sean-fang.com URLs

Experience and projects share one presentational component
(`components/ui/TimelineRow.tsx`) so the two sections can't drift visually —
experience passes static data with no `href`, projects pass MDX data linked
to their detail page.

Everything is statically generated at build time (`○`/`●` routes only —
no server rendering at request time). There is no client-side data
fetching anywhere; the only client JS is the effects.

## Rendering/layering model

- `PatchGrid` is a `position: fixed` div at `z-index: -10` (deliberately
  NOT `background-attachment: fixed`, which is broken on iOS Safari).
- Highlight cells and the cursor tracker render into portals/fixed divs at
  `z-index: 1`.
- Page content sits in a wrapper at `z-index: 10`, so text always renders
  above the translucent patches.
- Highlight cells are positioned in **viewport coordinates** snapped to the
  same 24px grid as the backdrop, which is why they always align. On
  scroll/resize an active highlight releases itself rather than chasing
  the element.

### B home: pluggable layouts

`components/photo/Streams.tsx` owns the motion only (a CSS scroll-driven transform per shot, rAF fallback, progressive mount, lightbox buttons). Placement is a pure function behind the `homeLayouts` registry in `lib/homeLayout.ts`: input = photo dimensions, viewport, river top, phone flag; output = per-shot box, z, speed (1 = page speed) and sideways drift, plus the river height. Laid out for the whole set, not just the mounted shots, so the first screenful doesn't move when the rest mounts. Pick with `theme.home.layout`, or `?home=<name>` on the URL for side-by-side QA.

- `field` (`lib/homeField.ts`, default while prototyping): straight-up motion; stratified shuffled depths drive size, speed and stacking; screen-time entry (the next shot enters when projected fill drops under the target); blue-noise x (best candidate) scored against the in-band coverage cap; a few seeds, best worst-case kept, readout on `data-field`. ~3 ms per seed on desktop; nothing per frame.
- `streams` (`lib/homeStreams.ts`): the original three interleaved lanes crossing at ~18°, knobs in `theme.home.streams`.
