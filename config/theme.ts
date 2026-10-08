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

  /**
   * The door: the one nav link ("off the clock") whose highlight never fully
   * rests. Idle, a few of its cells flicker; hover is the normal ripple; click
   * runs the A↔B shrink wave (SideFlip). Flicker stops once the visitor has
   * used the door (localStorage `door-found`).
   */
  door: {
    /** Highlight block height in cells, centred on the link (text row ± 1). */
    rows: 3,
    /** Average flicker ticks per second (randomised ±50%). Lab: slider 2 on the 2× card. */
    flickerPerSec: 4,
    /** Cells lit per tick. */
    flickerCells: 5,
    /** Peak alpha of a flickering cell (hover cells use 0.09–0.16). */
    flickerAlpha: 0.15,
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
    /**
     * Head start the ripple gets before the route change begins. Mounting the
     * arriving page blocks painting briefly; with the wave already moving
     * that reads as a beat, not a stall at the click.
     */
    sideNavHeadStartMs: 220,
    /**
     * Halo: each cell is tinted in the arriving side's signature color while
     * its tile shrinks (peak alpha here, fading to 0 as the tile closes), so
     * the wave has its own contrast when the two backgrounds are close.
     * 0 turns it off.
     */
    sideHaloAlpha: 0.1,
  },
} as const;
