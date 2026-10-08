/**
 * Site-wide design tokens and feature flags.
 * The accent color itself lives in app/globals.css as --accent / --accent-rgb
 * so CSS and JS never drift; everything else configurable lives here.
 */
export const theme = {
  /** Patch grid cell size in px. Backdrop, highlights, and tracker all derive from this. */
  cell: 24,

  flags: {
    /**
     * Default for the cursor-following patch (the "token under the pointer").
     * Visitors can override it with the footer toggle (persisted per-browser).
     */
    cursorTracker: true,
    /**
     * Default for link highlighting on hover/focus.
     * Visitors can override it with the footer toggle (persisted per-browser).
     */
    linkHighlighting: true,
    /**
     * Default for "plaintext mode" — a master switch that disables every
     * dynamic flourish at once (cursor tracker, highlights, hero diffusion,
     * footer caret). Visitors can override it with the footer toggle.
     */
    plainMode: false,
  },

  timing: {
    /** Patch-wave ripple: delay per cell of distance from the cursor entry point. */
    waveMsPerCell: 45,
    /**
     * Minimum total ripple spread. Small groups have tiny cell distances, so
     * without this floor their wave finishes almost instantly.
     */
    minWaveMs: 180,
    /** Diffusion text reveal: number of sampling steps and ms per step. */
    diffusionSteps: 24,
    diffusionMsPerStep: 55,
    /** VLM footer caption typing speed. */
    captionMsPerChar: 28,
    /**
     * A↔B side transition (SideFlip): the patch grid shrinks to points in a
     * ripple from the click. Delay per cell of distance from the click point
     * (the lab settled on 11–14ms; 12 reads as a wave, not a wipe).
     */
    sideMsPerCell: 12,
    /** How long one tile takes to shrink from full size to a point. */
    sideTileMs: 320,
    /** Random extra delay per tile, in cells, so the front isn't a clean ring. */
    sideJitterCells: 1,
    /**
     * Fade-out of the finished overlay once the arriving route has rendered
     * under it. Also the crossfade length used by the reduced-motion and
     * plaintext-mode fallbacks.
     */
    sideFadeMs: 250,
  },
} as const;
