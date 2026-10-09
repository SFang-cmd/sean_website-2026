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
    /**
     * Default colour scheme: "system" follows `prefers-color-scheme`;
     * "light" / "dark" force one. Visitors can override it with the theme
     * toggle in either side's footer (localStorage key `color-scheme`).
     */
    colorScheme: "system" as "system" | "light" | "dark",
  },

  /**
   * The door: the one nav link ("off the clock") whose highlight never fully
   * rests. Idle, a few of its cells flicker; hover is the normal ripple; click
   * runs the A↔B shrink wave (SideFlip). Flicker stops once the visitor has
   * used the door (localStorage `door-found`).
   */
  /**
   * The B home river. `layout: "field"` is the depth field (lib/homeField.ts:
   * vertical-only motion, depth drives size/speed/stacking, blue-noise
   * placement, coverage cap, screen-time fill); `"streams"` is the earlier
   * three-lane 18° drift, kept for comparison during the feedback round.
   */
  home: {
    layout: "field" as "field" | "streams",
    field: {
      /** Desktop/tablet knobs (see FieldKnobs). Values are the prototype defaults Sean approved. */
      desktop: { fast: 1.5, slow: 0.6, big: 42, small: 18, fill: 0.45, band: 0.7, cap: 0.2, candidates: 80, seeds: 12 },
      /**
       * Phones: shots share one column, so passes can't dodge sideways; the
       * cap only holds with smaller shots and a lower fill (sweep at 400×800:
       * 40–64vw at fill 0.3 → worst 20%, fill-min 32%; 50–82vw → worst 70%).
       */
      phone: { fast: 1.5, slow: 0.6, big: 64, small: 40, fill: 0.3, band: 0.7, cap: 0.2, candidates: 60, seeds: 6 },
    },
    /** The three-lane drift (lib/homeStreams.ts). Lane `speed` is a lag: 1 = page speed, 0.86 = climbs 14% faster. */
    streams: {
      angle: 18,
      phoneAngle: 12,
      /** Base vertical spacing, shared across streams; Sean preferred 640 over 460 with real photos. */
      stepY: 640,
      // Lanes sit apart (22% / 50% / 78%) and images are ~30vw so the streams
      // drift without covering each other.
      lanes: [
        { angleMul: 1.0, lane: 0.22, speed: 1.0 },
        { angleMul: -1.0, lane: 0.78, speed: 0.86 },
        { angleMul: 0.5, lane: 0.5, speed: 0.74 },
      ],
      /** Phones: a single centred stream (three lanes can't fit without stacking). */
      phoneLanes: [{ angleMul: 1.0, lane: 0.5, speed: 1.0 }],
    },
  },

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
