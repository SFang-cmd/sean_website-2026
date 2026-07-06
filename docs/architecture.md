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

## Directory layout

```
config/theme.ts        design tokens + feature flags (see configuration.md)
content/site.ts        name, tagline, about, contact, email, tag, nav,
                       socials, experience[] (all typed)
content/work/*.mdx     one file per project: frontmatter + case-study body
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
app/layout.tsx         fonts (Geist), metadata, PatchGrid + CursorTracker
                       mounts, 648px content column
app/page.tsx           single-page narrative: hero → about → experience →
                       projects → contact → footer
app/work/[slug]/       project case-study pages, statically generated from MDX
app/globals.css        color tokens (light/dark), Tailwind theme bridge,
                       smooth-scroll, .patch-link, .caret, .prose styles
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
