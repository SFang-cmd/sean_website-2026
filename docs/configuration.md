# Configuration reference

## `config/theme.ts`

| Key | Default | What it does |
| --- | ------- | ------------ |
| `cell` | `24` | Patch grid cell size (px). Backdrop, highlights, tracker, and layout rhythm all derive from it. |
| `flags.cursorTracker` | `true` | Default for the cursor-following patch. Visitors override via the footer toggle (localStorage key `patch-tracker`). |
| `flags.linkHighlighting` | `true` | Default for the patch-wave link highlights. Footer toggle, localStorage key `patch-highlighting`. |
| `flags.plainMode` | `false` | Default for **plaintext mode** — the master switch that disables every dynamic flourish at once (cursor tracker, highlights, hero diffusion + `t=` counter, footer caret). Keeps the static grid. Footer toggle, localStorage key `plain-mode`. |
| `timing.waveMsPerCell` | `45` | Highlight ripple pace — delay per cell of distance from cursor entry. Lower = snappier, higher = more liquid. |
| `timing.minWaveMs` | `180` | Minimum total ripple spread so tiny links still visibly wave. |
| `timing.diffusionSteps` | `24` | Hero reveal step count (the `t=` counter starts here). |
| `timing.diffusionMsPerStep` | `55` | Hero reveal speed (total ≈ steps × this). |
| `timing.captionMsPerChar` | `28` | Footer `tag` typing speed (the `VlmCaption` effect). |

## Accent color

Lives in `app/globals.css`, in **three** places that must stay in sync:

1. `--accent` under `:root` (light-mode text/link color, `#185fa5`)
2. `--accent` under the dark-mode media query (`#378add`)
3. `--accent-rgb` (`55, 138, 221`) — used for translucent patch fills;
   one mid-brightness value works for both modes.

To try a different accent, change those three lines. Candidates already
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
