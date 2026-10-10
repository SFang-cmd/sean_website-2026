# Configuration reference

## `config/theme.ts`

| Key | Default | What it does |
| --- | ------- | ------------ |
| `cell` | `24` | Patch grid cell size (px). Backdrop, highlights, tracker, and layout rhythm all derive from it. |
| `flags.cursorTracker` | `true` | Default for the cursor-following patch. Visitors override via the footer toggle (localStorage key `patch-tracker`). |
| `flags.linkHighlighting` | `true` | Default for the patch-wave link highlights. Footer toggle, localStorage key `patch-highlighting`. |
| `flags.plainMode` | `false` | Default for **plaintext mode** — the master switch that disables every dynamic flourish at once (cursor tracker, highlights, hero diffusion + `t=` counter, footer caret). Keeps the static grid. Footer toggle, localStorage key `plain-mode`. |
| `flags.colorScheme` | `"system"` | Default colour scheme: `system` follows `prefers-color-scheme`; `light` / `dark` force one. Visitors override via the theme toggle in either footer (localStorage key `color-scheme`); the choice becomes `<html data-theme>` and the inline script in `app/layout.tsx` applies it before first paint. |
| `timing.waveMsPerCell` | `45` | Highlight ripple pace — delay per cell of distance from cursor entry. Lower = snappier, higher = more liquid. |
| `timing.minWaveMs` | `180` | Minimum total ripple spread so tiny links still visibly wave. |
| `timing.diffusionSteps` | `24` | Hero reveal step count (the `t=` counter starts here). |
| `timing.diffusionMsPerStep` | `55` | Hero reveal speed (total ≈ steps × this). |
| `timing.captionMsPerChar` | `28` | Footer `tag` typing speed (the `VlmCaption` effect). |
| `door.rows` | `3` | The door's highlight block height in cells, centred on the link. |
| `door.flickerPerSec` | `4` | Idle flicker ticks per second (randomised ±50%). |
| `door.flickerCells` | `5` | Cells lit per flicker tick. |
| `door.flickerAlpha` | `0.15` | Peak alpha of a flickering cell. |
| `timing.sideMsPerCell` | `12` | A↔B shrink wave (`SideFlip`): delay per cell of distance from the click. |
| `timing.sideTileMs` | `320` | How long one tile takes to shrink to a point. |
| `timing.sideJitterCells` | `1` | Random extra delay per tile, in cells, so the front isn't a clean ring. |
| `timing.sideHaloAlpha` | `0.1` | Peak tint of a cell while its tile shrinks, in the arriving side's signature color; 0 disables. |
| `timing.sideNavHeadStartMs` | `220` | How long the ripple runs before the route change is kicked off underneath it. |
| `timing.sideFadeMs` | `250` | Crossfade length for the reduced-motion / plaintext / no-View-Transitions fallbacks. |

## Accent color

Lives in `app/globals.css`, in **four** places that must stay in sync:

1. `--accent` under `:root` (light-mode text/link color, `#185fa5`)
2. `--accent` under the dark-mode media query (`#378add`)
3. `--accent` under `:root[data-theme="dark"]` (the forced-dark twin of 2 —
   every dark token block exists twice, media branch and attribute branch)
4. `--accent-rgb` (`55, 138, 221`) — used for translucent patch fills;
   one mid-brightness value works for both modes.

To try a different accent, change those four lines. Candidates already
evaluated in context: teal `#1d9e75`, coral `#d85a30` (see
design-system.md for why blue won).

## Other knobs

- **Grid line strength:** `--grid-line` in `globals.css`. Keep lines at
  1px — 0.5px disappears on non-retina displays.
- **Highlight cell opacity range:** `0.09 + Math.random() * 0.07` in
  `lib/grid.ts` (`cellsForRect`).
- **Highlight padding:** `pad` prop on `PatchHighlight` (default 3px)
  before snapping to cells.
- **Tap-wave duration (touch):** 700ms timeout in `PatchHighlight`'s
  `onPointerDown`.
- **Content column:** `max-w-[648px]` (27 cells) in `app/layout.tsx`.
- **Link spacing near short links:** nav and footer use `gap-6` (24px,
  1 cell). A wider-gap + minimum-highlight-width variant was tried and
  reverted — see the decision log.

## Dev workflow

- `npm run dev` — dev server on :3000 (also `.claude/launch.json` for the
  preview panel).
- `npm run typecheck` — safe to run anytime.
- `npm run build` — **stop the dev server first.** Build rewrites `.next/`
  under a running dev server, which 404s its CSS/JS and looks like the
  styling crashed. Restart dev if it happens.
- `<body>` has `suppressHydrationWarning` because browser extensions
  (Grammarly, ColorZilla) inject attributes before hydration; it silences
  only attribute mismatches on that element.

## Deployment (planned)

Vercel, static output. Before going live: set the real domain in
`content/site.ts` (`url`), verify the LinkedIn URL, add a favicon set +
OG images. (No served resume — it was intentionally removed for privacy.)

## `theme.home` (B home river)

`layout` names a placement from the `homeLayouts` registry (`lib/homeLayout.ts`); `?home=<name>` on the URL overrides it for QA. `"field"` (default while prototyping) places the home photos as a depth field (`lib/homeField.ts`): each shot moves straight up at its own speed; depth drives size, speed and stacking. `"streams"` is the three-lane 18° drift (`lib/homeStreams.ts`), with its knobs in `streams` (angle, phone angle, step, lanes with angle sign, lane position and lag). Knobs per breakpoint in `field.desktop` / `field.phone`: `fast`/`slow` (speed of the nearest/farthest shot, 1 = page speed), `big`/`small` (width in vw), `landscapeScale` (width multiplier for landscapes, 1.5 on desktop so a far landscape is never a thumbnail), `fill` (target share of the viewport covered at any scroll), `band` and `cap` (while a shot's centre is in the middle `band` of the viewport, at most `cap` of it may be hidden by nearer shots), `candidates` (positions tried per shot), `seeds` and `seedOffset` (layouts tried, from seedOffset + 1; the best worst-case wins; bump the offset to reroll). The river element carries a `data-field` readout (`seed … worst … fill-min …`) for QA. Prototype with the same knobs: `docs/prototypes/b-home-field.html`.
