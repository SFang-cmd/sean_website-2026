# Plan: the two-sided site

Status: draft for Sean's review, 2026-10-08. Prototypes referenced live in `docs/prototypes/`.

## What we decided (locked unless you reopen it)

- **Two sides, one person.** A side = engineering (the current site, the model's view: grid, mono readouts). B side = creative, client-facing photography. The duality is *engineered vs. expressive*, not light vs. dark.
- **Transition = shrink wave** (`3-wave-lab.html`, "shrink (original)"): the 24px patches shrink to a point in a ripple from the click and the other side is underneath. Same move both directions; only the hairline color at the front changes (B's text color going in, A's blue coming back).
- **B look:** paper (`#f7f5f0`), neutral charcoal in dark mode, no grid, no accent color, Instrument Serif display + small sans. Images carry all the color.
- **B structure:** home = presentation (3 interleaved streams, ~18°, parallax, `b-home.html`); gallery = tool (sticky series index + grid/editorial, `b-gallery.html`). Door back to A is a small footer link, not a nav item.
- **Content pipeline = local.** `photos/` originals (gitignored) + `content/photos.csv` → `npm run photos` → optimized images in `public/photos/` + `content/photos.json`. No Google.
- **Perf bar:** not laggy on an average laptop. One transform per animated element, no scroll hijacking, no backdrop-filter, images via `next/image` with blur placeholders.

## Routes

| Route | What | Source |
|---|---|---|
| `/` | A home (hero, about, experience, projects, contact) | `content/site.ts` (exists) |
| `/work/[slug]` | project case studies | `content/work/*.mdx` (exists) |
| `/photo` | B home: the streams | `photos.json` where `home = true`, by `order` |
| `/photo/gallery` | B gallery: series index + grid | `photos.json` grouped by `series` + `content/series.ts` |
| `/photo/[id]` (optional) | single photo page / lightbox fallback, for sharing a link to one image | `photos.json` |

`/photo` must land cleanly by direct link (clients arrive that way) with no transition and no A-side chrome.

**Domains (decided 2026-10-08):** the root `sean-fang.com` stays the engineering site, unchanged. **`photos.sean-fang.com` is the canonical client-facing address for B**: a Vercel domain alias on the same deploy, with `next.config.ts` rewriting `photos.sean-fang.com/*` → `/photo/*`. Internally B always lives at `/photo`, so the A↔B transition is an in-app route change on whichever host you're on; `<link rel="canonical">` on the B pages points at the `photos.` host so search engines don't see duplicates. The B footer door goes to `sean-fang.com/`. No `tech.` subdomain: the root already carries the indexing, the resume links, and the bookmarks.

**Phase 0 note:** the root layout used to wrap everything in the 648px column + patch grid, so A pages moved into a route group `app/(a)/` with their own layout (URLs unchanged) and `app/photo/` got its own. Series seeded: portraits, sports, travel, aerial.

## Phases

Each phase lists what's in it, what it depends on, and who does it. Phases marked **∥** can run in parallel as separate agents in worktrees once Phase 0 is done.

### Phase 0: schema + scaffolding (one short session, me)
Defines the contracts the parallel phases build against.
- `content/photos.csv` columns: `file, title, place, year, series, home, order, alt`.
- `content/photos.json` shape (generated): `{ id, file, srcset: {avif, jpg} per width, width, height, blur, title, place, year, series, home, order, alt }`.
- `content/series.ts`: `{ slug, name, lede, order }[]`.
- Route skeletons: `app/photo/layout.tsx` (B theme scope: `.b` tokens, Instrument Serif via `next/font/google`), `app/photo/page.tsx`, `app/photo/gallery/page.tsx` as empty shells.
- `.gitignore`: `photos/`.
- Update `docs/architecture.md` + `docs/adding-content.md` with the above.

### Phase 1 ∥: photo pipeline (agent)
- `scripts/photos.ts` (`npm run photos`): read CSV, read `photos/`, strict mismatch errors, `sharp` → 480/960/1600 AVIF+JPEG + 20px blur base64, write `public/photos/` and `content/photos.json`. Fallback to IPTC title/caption when a CSV cell is blank (via `exifr`).
- Idempotent and incremental: skip images whose output already exists and whose source mtime hasn't changed.
- Three sample images + rows so the B pages have something real to render during development.
- Deps: Phase 0 schema. Blocks: nothing (B pages can build against the schema with sample JSON).

### Phase 2 ∥: B pages (agent, the big one)
- `app/photo/page.tsx`: port `b-home.html` streams to React. Positions computed once per layout (resize-observed), one CSS scroll-driven transform per shot via `animation-timeline: scroll()`, rAF fallback for browsers without it, plain vertical for reduced motion and for the plaintext toggle. `next/image` with `placeholder="blur"`. Hero + "Work with me" + footer door.
- `app/photo/gallery/page.tsx`: port `b-gallery.html`. Sticky index, grid/editorial toggle (persisted in localStorage like the existing effect toggles), native `<dialog>` lightbox with keyboard nav.
- B nav component (`Sean Fang · Gallery · Work with me`), B footer.
- Mobile: streams angle capped ~12°, gallery single column.
- Deps: Phase 0. Uses Phase 1's sample JSON.

### Phase 3 ∥: the transition (agent, spike first)
Goal: clicking `photos` on A (or the door on B) runs the shrink wave between `/` and `/photo` with real page content under the tiles, then completes the route change.
- **Spike A (preferred):** arriving page rendered beneath, departing page on top with an SVG `<mask>` of ~2,000 `<rect>`s that shrink in ripple order (Web Animations API, one animation per rect, staggered). True per-cell reveal of real content, no snapshots. Verify it holds 60fps on a mid laptop; verify Safari.
- **Spike B (fallback, known-good):** `3-flipdot-wave.html` approach: canvas overlay paints shrinking solid tiles in the departing side's background color, then swap. Content doesn't shrink, tiles do. Already verified cheap.
- Pick one by measuring, then: wire into Next navigation (`router.push` after the wave, keep the arriving page prefetched), `prefers-reduced-motion` and plaintext mode → 250ms crossfade, direct links → no transition.
- Deps: Phase 0 routes. Independent of Phase 1 and 2 (can develop against the shells).

### Phase 4 ∥: A-side revisions (me + Sean, copy work)
- Nav: `about / work / photos / contact` (`photos` is the door). Fold "experience" + "projects" under `work` visually or keep both; decide when editing.
- Whole-person rewrite: new `tagline` (candidates in DEVLOG 2026-10-08), About paragraphs (photography promoted from a throwaway clause to a real paragraph), `availability` line no longer recruiting-shaped.
- Blurb cleanup: `$1.1M` twice, Anthropic "800+/200-person"; remove dead `site.role`.
- OG image/meta description follow the new tagline automatically (already wired).
- Deps: none. Sean's voice rules: `career/CLAUDE.md` style, no em-dashes, claim-then-evidence.

### Phase 5: real content (Sean)
- Export 30–40 images for the home (`home = true`) and however many for the gallery; drop in `photos/`; fill `photos.csv`.
- Name the series and write one-line ledes (`series.ts`).
- "Work with me" copy: what you take on, where, how to reach you, Instagram handle.
- Hero line for B (final copy; the prototype's is a placeholder).
- Deps: Phase 1 script exists. Can start the export/sorting any time.

### Phase 6: integration + QA (me)
- Merge the parallel branches, run `npm run photos` on real content, build.
- Checks: Lighthouse on `/` and `/photo` (target: LCP < 2.5s on 4G, CLS ~0), payload budget for `/photo` first screen (< ~1MB images), 60fps scroll on a mid laptop, Safari + Firefox (scroll-timeline fallback path), iPhone, dark mode on both sides, reduced motion, plaintext mode, keyboard-only through the lightbox, alt text present.
- Docs: `design-system.md` gets the B side and the transition; `adding-content.md` gets the photo workflow; `STATUS.md`/`DEVLOG.md` as usual.

### Phase 7: launch
- Deploy to Vercel (existing project). `/photo` sitemap entries, OG image for `/photo` (one hero photo), `robots` unchanged.
- Optional: `photo.sean-fang.com` as a redirect to `/photo` for a cleaner client-facing URL.
- Instagram bio link → `/photo`.

## Parallel plan, concretely

After Phase 0 (one session), launch three agents in worktrees at once:

| Agent | Phase | Deliverable | Rough size |
|---|---|---|---|
| `pipeline` | 1 | `scripts/photos.ts`, sample content, docs | small |
| `b-pages` | 2 | `/photo`, `/photo/gallery`, lightbox, B nav/footer | large |
| `transition` | 3 | spike report + chosen implementation wired to nav | medium, uncertain |

Phase 4 runs alongside as conversation (it's copy, needs you). Phase 5 is yours and can start day one. Phase 6 is sequential after all three land. A `/code-review` pass on each branch before merging is cheap and worth it.

## Risks, in order

1. **Transition with real content (Phase 3).** The SVG-mask approach is unproven; the canvas fallback is proven but shrinks solid tiles, not content. Decide by measurement, not taste. Time-box the spike to one session.
2. **Scroll-driven animations in Safari/Firefox.** Chrome and Safari 26 support `animation-timeline`; Firefox is behind a flag. The rAF fallback must be first-class, not an afterthought.
3. **Image weight on `/photo`.** 36 images on one page is only fine with strict `sizes`, lazy loading, and blur placeholders. Budget it in Phase 6, don't guess.
4. **Scope creep on B.** Per-photo pages, series pages, print sales, a blog: all tempting, all later. Home + gallery + lightbox is the launch.

## Not in scope for launch

Video, the Instagram feed embed, per-series pages, a CMS, analytics beyond Vercel's, the "model caption" easter egg on B (dropped: clients don't want the joke), any A-side visual redesign.

## Rough timeline

Side-project pace (this is the side slot; splatting stays the main slot until mid-Nov):
- Week 1: Phase 0, launch Phases 1–3 in parallel, start Phase 4 copy, you start exporting.
- Week 2: Phases 1–3 land, Phase 4 done, Phase 5 content in.
- Week 3: Phase 6 QA, Phase 7 launch.
