# Design system

## Thesis

**Quiet confidence — research lab, not agency.** The site must prove
ability through restraint: typography does the work, one accent color,
instant loads, effects that reference the math of computer vision without
requiring that reading to work as design. Everything must stay
role-general (SWE / MLE / PM recruiting), so nothing may read as
CV-only decoration.

The organizing metaphor: **the page as seen by a vision model.** The
backdrop is the ViT patch grid; hovering a link is attention lighting up
the patches covering it; the hero resolves like a diffusion sample; the
footer captions the page like a VLM. Each piece is deniable as plain
minimalism.

## Tokens

Defined in `app/globals.css` (`:root` + dark-mode override), bridged into
Tailwind utilities via `@theme inline` (`text-fg`, `text-muted`,
`text-faint`, `text-accent`, `border-line`).

| Token          | Light                | Dark                 | Use |
| -------------- | -------------------- | -------------------- | --- |
| `--bg`         | `#fcfcfa`            | `#121211`            | page background |
| `--fg`         | `#191918`            | `#ececea`            | primary text |
| `--muted`      | `#6b6b68`            | `#a0a09b`            | secondary text |
| `--faint`      | `#a3a39e`            | `#6e6e69`            | metadata, mono labels |
| `--accent`     | `#185fa5`            | `#378add`            | links, accents (engineering blue) |
| `--accent-rgb` | `55, 138, 221`       | same                 | patch fills via `rgba(var(--accent-rgb), α)` |
| `--grid-line`  | `rgba(128,128,128,.11)` | `rgba(140,140,140,.15)` | backdrop grid |
| `--line`       | `rgba(128,128,128,.28)` | `rgba(140,140,140,.3)`  | row dividers |

Accent rationale: blue = trust/competence for a recruiting audience; the
patch highlights read subconsciously as text selection; blue links are
the web's oldest affordance. Runner-up was teal; violet was rejected as
the stock "AI company" color.

Fonts: **Geist Sans** (body) and **Geist Mono** (metadata: years, labels,
counters, captions), via the `geist` package. Mono is the "instrument
readout" voice — anything that pretends to be model output uses it.

Dark mode follows `prefers-color-scheme` by default, with a manual override
shared by both sides: the footer `ThemeToggle` (`lib/themeStore.ts`) cycles
system → light → dark and writes `<html data-theme="light|dark">` (removed
for system), persisted in localStorage as `color-scheme`. In CSS an explicit
attribute always wins: dark tokens apply under `:root[data-theme="dark"]`
and, via the media query, under `:root:not([data-theme="light"])` (same
pair for `.b`), with `color-scheme` set alongside so form controls match.
An inline script in `app/layout.tsx` applies the stored choice before first
paint. Every effect reads tokens through CSS variables, so none needs to
know about the choice; the lightbox surround stays `#141414` in all schemes.

## The grid

- 24px cells (`theme.cell`), rendered by `PatchGrid` as a fixed backdrop
  the content scrolls over (the "instrument, not paper" choice — content
  moves through a stationary sensor).
- Grid lines are 1px, not 0.5px: sub-pixel lines vanish on DPR-1 displays.
- Spacing aims for cell multiples (Tailwind: `6` = 1 cell, `12` = 2 cells,
  `24` = 4 cells) so the layout feels cut from the grid.

## Effects (all in `components/effects/`)

Every effect respects `prefers-reduced-motion` (static/instant fallback)
and none of them ever blocks input or navigation.

### PatchHighlight
Wraps a link; on hover/focus lights the backdrop cells covering it,
rippling from the cursor entry point (~45ms per cell of distance,
stretched to ≥180ms total for small links). Per-cell randomized opacity
(0.09–0.16) gives a patchwork shimmer; perimeter cells get a hairline
inset outline. Fires on keyboard focus too. On touch, `pointerdown`
flashes the wave for 700ms without delaying the tap's navigation.
Implementation notes: cells portal to `document.body`, mount at opacity 0
and light one frame later (transitions don't run on elements that mount
visible — this caused an instant-flash bug on first hover per link).

### PatchGrid
The backdrop. Static, no interaction, ~zero cost.

### DiffusionText
Hero text resolves from noise glyphs over ~24 × 55ms steps, with an
optional `t=N` counter. Server-renders final text (SEO/LCP-safe); runs
once on mount, then the page is still.

### CursorTracker
Single faint patch snapped under the cursor ("the token under the
pointer"). Default on (`theme.flags.cursorTracker`); visitors toggle it
in the footer, persisted per-browser (`lib/trackerStore.ts`,
localStorage key `patch-tracker`).

### BlurThumb
Images sharpen from blur like a sampler converging (t=50 → 0 counter).
Doubles as the image loading state. Not yet used on any page — ready for
case-study thumbnails.

### VlmCaption
Footer line typed out on scroll-into-view, written as a model-readout `tag`
for the person. Text lives in `content/site.ts` (`tag`, e.g.
`> tag: … [0.98]`).

### SideFlip (`SideLink`)
The A↔B transition. Clicking a `SideLink` (the nav door on A, `engineering →`
on B) runs the **shrink wave**: every 24px patch shrinks to a point in a
ripple from the click, revealing the other side underneath, then the route
change completes. Timing: `theme.timing.sideMsPerCell` (12) per cell of
distance, `sideTileMs` (320; ×0.75 on phones) per tile, `sideJitterCells` (1)
of jitter, ~1.1 s across a laptop screen. A 3px dot flashes in the arriving
side's signature color (B's text color going in, A's blue coming back) as
each tile closes.

**How (approach "A2" from the spike harness,
`docs/prototypes/transition-harness/`):** the departing page's DOM is cloned
into a fixed, inert overlay at the same scroll offset; Next swaps the route
underneath at once; the overlay's `clip-path` is rebuilt every frame as one
`path()` of the still-visible tiles. A thin canvas under the overlay paints
the arriving background until the new route has mounted, then only the dot
flashes, so the holes show real arriving content. The wave runs on frame
time (a stalled frame advances it by at most 50 ms) and bails to a fade if
six frames stall. No View Transitions API: the snapshot approach ("A3") was
dropped by the browser around the route change in Chrome, Brave and Safari.

Fallbacks: reduced motion or plaintext mode → a `sideFadeMs` (250) crossfade;
modifier/middle clicks → normal link; keyboard activation ripples from the
link's centre; direct loads never animate; on `photos.sean-fang.com` the door
to A leaves via a crossfade + full load (`hardHref`). Touch gets the wave too
(`PatchHighlight` lets `data-side-link` links handle their own tap).

### The door (PatchHighlight `idle="flicker"` + `SideLink`)
The last nav item, *off the clock*, is the way into the photography side.
It is set in Instrument Serif italic — the B side's face — so it is the one
item on A that visibly belongs to B. Its highlight block is always exactly 3
cells tall (`theme.door.rows`, centred on the text) and never fully rests:
idle, a few random cells of the block flicker faintly
(`theme.door.flickerPerSec` ticks/s, `flickerCells` per tick, peak
`flickerAlpha`), as if the model keeps glancing at it. Hover is the ordinary
ripple; click runs the shrink wave (SideFlip). The flicker stops for good once
the visitor has used the door (localStorage `door-found`), and is off under
plaintext mode, highlighting-off, or reduced motion. Prototype history:
`docs/prototypes/door-lab*.html`.

### Plaintext mode
A master footer toggle (`lib/plainStore.ts`, `PlainToggle`) that disables
**every dynamic flourish at once**: cursor tracker, link highlights, the
hero diffusion reveal (and its `t=` counter), and the footer caret/typing.
Each effect reads `usePlainEnabled()` and falls back to its static form.
Deliberately **keeps the static PatchGrid backdrop** — the intent is "no
motion / nothing dynamic," and the grid is neither. When plaintext mode is
on, `EffectToggles` hides the now-redundant cursor/highlight toggles.
It's the user-controlled sibling of `prefers-reduced-motion`.

## Decision log

- **Rejected: animated static/noise backdrop** — reads as degraded signal,
  psychologically stressful. Grid = precision instead of decay.
- **Rejected: video-scrubber/timecode theme** — too CV-specialized for a
  site that also recruits for SWE/PM.
- **Tried and reverted (2026-07): 4-cell minimum highlight width** for
  short links (GitHub/LinkedIn), with wider nav/footer gaps to fit. Looked
  worse in practice; highlights are back to the natural snap
  (`cellsForRect` has no minimum), gaps back to 24px.
- **Kept: 180ms minimum ripple spread** (`theme.timing.minWaveMs`) so
  small links still show a perceptible wave.
- **Open A/B: cursor tracker default.** Currently on; flip
  `theme.flags.cursorTracker` if living with it says otherwise.
- **Restructured (2026-07): single-page narrative.** Moved from a minimal
  hero + dynamic `/work` index to hero → about → experience → projects →
  contact → footer on one page. Experience is static data in `site.ts`;
  projects keep MDX detail pages (the "hybrid" model).
- **Removed experience blurbs.** The timeline shows `company · role · dates`
  only — for a confidence-through-restraint read, the names carry it and the
  About section holds the narrative. Blurbs remain in the data, unrendered.
- **Added plaintext mode.** A user-facing "give me the boring version"
  switch (see the effect above), distinct from `prefers-reduced-motion`
  because it also turns off non-motion flourishes (tracker, highlights).
