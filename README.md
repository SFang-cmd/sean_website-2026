# sean-fang.com — 2026

Personal site for Sean Fang. Next.js 15 + Tailwind CSS 4, fully static,
themed around "the page as seen by a vision model" — a fixed patch grid,
patch-wave link highlights, a diffusion text reveal, and a VLM caption
easter egg, all restrained enough to read as plain good design.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run build      # production build — stop the dev server first!
```

> **Gotcha:** `next build` rewrites `.next/` while `next dev` is serving
> from it. Running a build with the dev server up makes the live page lose
> its CSS/JS (looks like the styles "crashed"). Restart the dev server if
> that happens.

## Docs

- [docs/architecture.md](docs/architecture.md) — directory layout, principles, data flow
- [docs/design-system.md](docs/design-system.md) — the visual theme: grid, colors, effects, decision log
- [docs/adding-content.md](docs/adding-content.md) — how to add projects, edit bio/links, add pages
- [docs/configuration.md](docs/configuration.md) — every knob: theme flags, timings, accent color

## The 30-second tour

The site is a single-page narrative — hero → about → experience → projects
→ contact → footer. Life updates are **data edits, not code edits**: your
one-liners and the experience timeline live in
[content/site.ts](content/site.ts); projects are one MDX file each in
[content/work/](content/work/), each with its own `/work/<slug>` case-study
page. Visual effects are self-contained leaf components in
[components/effects/](components/effects/) (all silenceable at once via the
footer **plaintext mode** toggle); shared patch-grid math lives in
[lib/grid.ts](lib/grid.ts); tunables live in
[config/theme.ts](config/theme.ts).
