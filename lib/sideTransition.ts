import { theme } from "@/config/theme";

/**
 * The A↔B side transition ("SideFlip"): the 24px patch grid shrinks to points
 * in a ripple from the click, revealing the other side underneath, then the
 * route change completes. Pure DOM; the React glue is
 * components/effects/SideFlip.tsx.
 *
 * How the real content gets under the tiles: on click the departing page's
 * DOM is cloned into a fixed overlay (same CSS, same scroll offset), Next
 * swaps the route beneath it, and we drive the overlay's `clip-path` every
 * frame with one `path()` made of every still-visible tile (the "A2" approach
 * from the spike harness, docs/prototypes/transition-harness/). The arriving
 * page is the live document, so what shows through each hole is real
 * content. No View Transitions API: that route (A3) froze a snapshot the
 * browser then dropped around the route change in Chrome, Brave and Safari.
 */

export type Side = "a" | "b";

export interface SideTokens {
  bg: string;
  fg: string;
  accent: string;
}

/** Which side a Next pathname belongs to. B lives under /photo; the rest is A. */
export function sideOf(pathname: string): Side {
  return pathname === "/photo" || pathname.startsWith("/photo/") ? "b" : "a";
}

/**
 * Read a side's tokens from computed styles so dark mode just works. A's
 * tokens live on :root; B's are scoped to `.b`, so those are resolved on a
 * throwaway hidden element.
 */
export function readSideTokens(side: Side): SideTokens {
  let el: HTMLElement = document.documentElement;
  let probe: HTMLElement | null = null;
  if (side === "b") {
    probe = document.createElement("div");
    probe.className = "b";
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;width:0;height:0;visibility:hidden";
    document.body.appendChild(probe);
    el = probe;
  }
  const cs = getComputedStyle(el);
  const read = (name: string) => cs.getPropertyValue(name).trim();
  const tokens = { bg: read("--bg"), fg: read("--fg"), accent: read("--accent") };
  probe?.remove();
  return tokens;
}

/**
 * The color that flashes at the instant a tile is smallest: the arriving
 * side's signature. B has no accent, so its text color; A's is its blue.
 */
export function signatureColor(side: Side, tokens: SideTokens): string {
  return side === "b" ? tokens.fg : tokens.accent;
}

export interface Wave {
  cell: number;
  cols: number;
  rows: number;
  /** Per-tile start delay in ms, row-major. */
  delays: Float32Array;
  /** When the last tile has shrunk to a point. */
  total: number;
  /** Per-tile shrink duration (shorter on phones). */
  tileMs: number;
}

/** Ripple timing for every tile covering a width×height viewport, from an origin in CSS px. */
export function buildWave(
  width: number,
  height: number,
  originX: number,
  originY: number,
): Wave {
  const cell = theme.cell;
  const { sideMsPerCell, sideJitterCells } = theme.timing;
  const sideTileMs = tileMsFor(width);
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const ci = originX / cell - 0.5;
  const cj = originY / cell - 0.5;
  const delays = new Float32Array(cols * rows);
  let max = 0;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      // Jitter breaks the clean rings up so the front reads as patches
      // popping, not a wipe.
      const d =
        (Math.hypot(i - ci, j - cj) + Math.random() * sideJitterCells) *
        sideMsPerCell;
      delays[j * cols + i] = d;
      if (d > max) max = d;
    }
  }
  return { cell, cols, rows, delays, total: max + sideTileMs, tileMs: sideTileMs };
}

/** Phones get shorter tiles: fewer cells to cross, so the wave stays brisk. */
export function tileMsFor(width: number): number {
  return width < 768 ? Math.round(theme.timing.sideTileMs * 0.75) : theme.timing.sideTileMs;
}

/** Tile size falls fast and settles into the point (ease-out). */
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * The departing snapshot's clip at time t: unreached tiles at full size,
 * reached tiles shrinking about their centre, finished tiles omitted. One
 * `path()` of up to ~6,500 subpaths at 2560×1440; measured cheap because the
 * browser rasterizes it once per frame on the compositor side.
 */
export function clipPathAt(wave: Wave, t: number): string {
  const { cell, cols, rows, delays } = wave;
  const tileMs = wave.tileMs;
  let d = "";
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const lt = (t - delays[j * cols + i]) / tileMs;
      if (lt >= 1) continue;
      if (lt <= 0) {
        d += `M${i * cell} ${j * cell}h${cell}v${cell}h-${cell}z`;
        continue;
      }
      const size = cell * (1 - easeOut(lt));
      const x = i * cell + (cell - size) / 2;
      const y = j * cell + (cell - size) / 2;
      const s = size.toFixed(1);
      d += `M${x.toFixed(1)} ${y.toFixed(1)}h${s}v${s}h-${s}z`;
    }
  }
  return d ? `path("${d}")` : "inset(100%)";
}

/**
 * The hairline/dot flash in the arriving side's signature color at the
 * moment each tile is smallest. Painted on a thin canvas in the live
 * document, so it only shows where the snapshot above has opened up.
 */
export function paintFlashes(
  ctx: CanvasRenderingContext2D,
  wave: Wave,
  t: number,
  color: string,
  width: number,
  height: number,
): void {
  const { cell, cols, rows, delays } = wave;
  const tileMs = wave.tileMs;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const lt = (t - delays[j * cols + i]) / tileMs;
      // Visible around the point moment: fades in as the tile closes, out
      // just after it has gone.
      if (lt < 0.7 || lt > 1.3) continue;
      ctx.globalAlpha = 1 - Math.abs(lt - 1) / 0.3;
      ctx.fillRect(i * cell + cell / 2 - 1.5, j * cell + cell / 2 - 1.5, 3, 3);
    }
  }
  ctx.globalAlpha = 1;
}

export function supportsViewTransitions(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function"
  );
}

/**
 * Resolves once the browser location is `pathname` (Next updates it in the
 * same commit that mounts the arriving route), or after `timeoutMs` so a
 * failed navigation can't freeze the page inside a view transition.
 */
export function waitForPathname(pathname: string, timeoutMs = 2500): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      observer.disconnect();
      clearInterval(poll);
      clearTimeout(timer);
      resolve();
    };
    const check = () => {
      if (window.location.pathname === pathname) finish();
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    const poll = setInterval(check, 50);
    const timer = setTimeout(finish, timeoutMs);
    check();
  });
}

/** Above the A wrapper (z-10) and the B wrapper; only ever holds pointer-events:none chrome. */
const OVERLAY_Z = 1000;
const FIXED_FULL = `position:fixed;inset:0;pointer-events:none;z-index:${OVERLAY_Z}`;

let inFlight = false;

/** True while a wave or crossfade is running; further SideLink clicks are ignored. */
export function isSideTransitionInFlight(): boolean {
  return inFlight;
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.cssText = `${FIXED_FULL};width:${width}px;height:${height}px`;
  canvas.setAttribute("aria-hidden", "true");
  canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
  return canvas;
}

function makeStyle(css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.setAttribute("data-side-flip", "");
  style.textContent = css;
  document.head.appendChild(style);
  return style;
}

export interface WaveOptions {
  /** Click point (or link centre) in viewport px. */
  origin: { x: number; y: number };
  arriving: Side;
  /** Performs the route change; resolves once the arriving route is in the DOM. */
  navigate: () => Promise<void>;
}

/** Elements never worth cloning into the overlay. */
const SKIP_CLONE = "script,style,link,noscript,canvas,[data-side-flip]";

/**
 * Make a cloned subtree truly static: bake every element's current computed
 * transform into the copy and strip its animations/transitions. Without
 * this, scroll-driven animations in the copy (the photo streams) keep
 * following the document's scroll, which Next resets to the top on the route
 * change, so the copy would visibly jump mid-wave.
 */
function freeze(original: Element, copy: Element): void {
  const origs = [original, ...Array.from(original.querySelectorAll("*"))];
  const copies = [copy, ...Array.from(copy.querySelectorAll("*"))];
  for (let i = 0; i < origs.length && i < copies.length; i++) {
    const target = copies[i] as HTMLElement;
    if (!target.style) continue;
    const cs = getComputedStyle(origs[i]);
    if (cs.animationName !== "none") {
      if (cs.transform !== "none") target.style.transform = cs.transform;
      if (cs.opacity !== "1") target.style.opacity = cs.opacity;
      target.style.animation = "none";
    }
    if (cs.transitionProperty !== "all" || cs.transitionDuration !== "0s") {
      target.style.transition = "none";
    }
  }
}

/**
 * A static copy of the current page in a fixed overlay, at the same scroll
 * offset. Fixed descendants (the patch grid, the B nav) keep their viewport
 * position because the overlay is scrolled, not transformed.
 */
function cloneDeparting(bg: string): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.setAttribute("data-side-flip", "");
  overlay.style.cssText = `${FIXED_FULL};overflow:hidden;background:${bg};will-change:clip-path`;
  // `inert` keeps the copy out of focus order and assistive tech.
  overlay.setAttribute("inert", "");
  for (const child of Array.from(document.body.children)) {
    if (child.matches(SKIP_CLONE)) continue;
    const copy = child.cloneNode(true) as HTMLElement;
    freeze(child, copy);
    copy.querySelectorAll(SKIP_CLONE).forEach((n) => n.remove());
    overlay.appendChild(copy);
  }
  document.body.appendChild(overlay);
  overlay.scrollTop = window.scrollY;
  overlay.scrollLeft = window.scrollX;
  return overlay;
}

/** Frames longer than this count as stalls; several in a row abort the wave. */
const SLOW_FRAME_MS = 50;
const SLOW_FRAMES_TO_BAIL = 6;

/**
 * The shrink wave. Clones the departing page over the live document, swaps
 * the route beneath it, then clips the clone tile by tile. Until the arriving
 * page has mounted, the holes show its background; after, its real content.
 * Everything it adds to the DOM is removed when it ends.
 */
export async function runShrinkWave({ origin, arriving, navigate }: WaveOptions): Promise<void> {
  if (inFlight) return;
  inFlight = true;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const wave = buildWave(width, height, origin.x, origin.y);
  const departing: Side = arriving === "a" ? "b" : "a";
  const departingBg = readSideTokens(departing).bg;
  const arrivingTokens = readSideTokens(arriving);
  const color = signatureColor(arriving, arrivingTokens);

  // Under the overlay: the arriving background (until the new route is in),
  // then only the dot flashes.
  const canvas = makeCanvas(width, height);
  canvas.style.zIndex = String(OVERLAY_Z - 1);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  let arrived = false;

  const overlay = cloneDeparting(departingBg);
  overlay.style.clipPath = clipPathAt(wave, 0);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(safety);
    overlay.remove();
    canvas.remove();
    inFlight = false;
  };
  // Belt and braces: nothing may outlive the transition (hidden tab, back
  // button mid-wave, a navigation that never resolves).
  const safety = setTimeout(cleanup, wave.total + 6000);
  window.addEventListener("pagehide", cleanup, { once: true });

  const paint = (t: number) => {
    if (!ctx) return;
    if (!arrived) {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = arrivingTokens.bg;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = color;
      // paintFlashes clears the canvas, so draw the flashes by hand here.
      const { cell, cols, rows, delays, tileMs } = wave;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const lt = (t - delays[j * cols + i]) / tileMs;
          if (lt < 0.7 || lt > 1.3) continue;
          ctx.globalAlpha = 1 - Math.abs(lt - 1) / 0.3;
          ctx.fillRect(i * cell + cell / 2 - 1.5, j * cell + cell / 2 - 1.5, 3, 3);
        }
      }
      ctx.globalAlpha = 1;
    } else {
      paintFlashes(ctx, wave, t, color, width, height);
    }
  };

  try {
    // The overlay hides the swap, so the route change can start whenever.
    // Give the ripple a short head start first: mounting the arriving page
    // blocks painting for a beat, and it reads better once the wave is
    // visibly underway than as a hitch at the very start.
    const nav = new Promise<void>((resolve) =>
      setTimeout(resolve, theme.timing.sideNavHeadStartMs),
    )
      .then(navigate)
      .then(() => {
        arrived = true;
      });
    await new Promise<void>((resolve) => {
      // Frame time, not wall time: a stalled frame (the arriving page laying
      // out, image decode) advances the wave by at most one short step, and
      // a run of stalls gives up on the wave rather than stutter through it.
      let last = 0;
      let t = 0;
      let slow = 0;
      const frame = (now: number) => {
        if (last) {
          const dt = now - last;
          if (dt > SLOW_FRAME_MS) slow++;
          t += Math.min(dt, SLOW_FRAME_MS);
        }
        last = now;
        if (slow >= SLOW_FRAMES_TO_BAIL) {
          // Too janky here: fade the copy out instead.
          overlay.style.clipPath = "none";
          overlay.style.transition = `opacity ${theme.timing.sideFadeMs}ms ease`;
          overlay.style.opacity = "0";
          if (ctx) ctx.clearRect(0, 0, width, height);
          setTimeout(resolve, theme.timing.sideFadeMs);
          return;
        }
        overlay.style.clipPath = clipPathAt(wave, t);
        paint(t);
        if (t < wave.total) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    await nav;
  } catch {
    /* the route change still happened; just make sure nothing is left behind */
  } finally {
    cleanup();
  }
}

export interface CrossfadeOptions {
  arriving: Side;
  /** Performs the route change; resolves once the arriving route is in the DOM. */
  navigate?: () => Promise<void>;
  /**
   * Absolute URL to load instead of a client navigation. Used when the
   * in-app href can't be reached on the current host (B → A from
   * photos.sean-fang.com, where "/" is rewritten back onto B).
   */
  hard?: string;
}

/**
 * The still fallback: a plain crossfade (reduced motion, plaintext mode,
 * no View Transitions support, or a cross-host door). With View Transitions
 * it is the browser's own crossfade of the two pages; without, it fades
 * through the arriving side's background.
 */
export async function runCrossfade({ arriving, navigate, hard }: CrossfadeOptions): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  const fadeMs = theme.timing.sideFadeMs;

  if (!hard && navigate && supportsViewTransitions()) {
    const style = makeStyle(
      `::view-transition-old(root),::view-transition-new(root){animation-duration:${fadeMs}ms}`,
    );
    try {
      await document.startViewTransition(navigate).finished;
    } catch {
      /* skipped: the route change still happened */
    } finally {
      style.remove();
      inFlight = false;
    }
    return;
  }

  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  veil.style.cssText = `${FIXED_FULL};background:${readSideTokens(arriving).bg};opacity:0;transition:opacity ${fadeMs / 2}ms ease`;
  document.body.appendChild(veil);
  const cleanup = () => {
    veil.remove();
    inFlight = false;
  };
  const safety = setTimeout(cleanup, fadeMs + 8000);
  window.addEventListener("pagehide", cleanup, { once: true });
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  await new Promise(requestAnimationFrame);
  veil.style.opacity = "1";
  await wait(fadeMs / 2);
  if (hard) {
    // The veil stays up until the new document replaces this one.
    window.location.assign(hard);
    return;
  }
  try {
    await navigate?.();
  } finally {
    veil.style.opacity = "0";
    await wait(fadeMs / 2);
    clearTimeout(safety);
    cleanup();
  }
}
