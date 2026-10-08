import { theme } from "@/config/theme";

/**
 * The A↔B side transition ("SideFlip"): the 24px patch grid shrinks to points
 * in a ripple from the click, revealing the other side underneath, then the
 * route change completes. Pure DOM; the React glue is
 * components/effects/SideFlip.tsx.
 *
 * How the real content gets under the tiles: the departing page is frozen as
 * a View Transition snapshot (`::view-transition-old(root)`) while Next swaps
 * the route beneath it, and we drive that snapshot's `clip-path` every frame
 * with one `path()` made of every still-visible tile. The arriving page is
 * the live document, so what shows through each hole is real content.
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
}

/** Ripple timing for every tile covering a width×height viewport, from an origin in CSS px. */
export function buildWave(
  width: number,
  height: number,
  originX: number,
  originY: number,
): Wave {
  const cell = theme.cell;
  const { sideMsPerCell, sideJitterCells, sideTileMs } = theme.timing;
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
  return { cell, cols, rows, delays, total: max + sideTileMs };
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
  const tileMs = theme.timing.sideTileMs;
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
  const tileMs = theme.timing.sideTileMs;
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

/** The view-transition pseudo tree with its default crossfade and blending turned off. */
const VT_RESET =
  "::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}" +
  "::view-transition-image-pair(root){isolation:auto}";

export interface WaveOptions {
  /** Click point (or link centre) in viewport px. */
  origin: { x: number; y: number };
  arriving: Side;
  /** Performs the route change; resolves once the arriving route is in the DOM. */
  navigate: () => Promise<void>;
}

/**
 * The shrink wave. Freezes the departing page as the view-transition "old"
 * snapshot, swaps the route beneath it, then clips the snapshot tile by tile.
 * Everything it adds to the DOM is removed when it ends.
 */
export async function runShrinkWave({ origin, arriving, navigate }: WaveOptions): Promise<void> {
  if (inFlight) return;
  inFlight = true;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const wave = buildWave(width, height, origin.x, origin.y);
  const color = signatureColor(arriving, readSideTokens(arriving));

  const style = makeStyle(VT_RESET);
  const sheet = style.sheet as CSSStyleSheet;
  const rule = sheet.cssRules[
    sheet.insertRule("::view-transition-old(root){}", sheet.cssRules.length)
  ] as CSSStyleRule;
  rule.style.clipPath = clipPathAt(wave, 0);
  const canvas = makeCanvas(width, height);
  document.body.appendChild(canvas);

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(safety);
    canvas.remove();
    style.remove();
    inFlight = false;
  };
  // Belt and braces: nothing may outlive the transition (hidden tab, back
  // button mid-wave, a skipped transition).
  const safety = setTimeout(cleanup, wave.total + 6000);
  window.addEventListener("pagehide", cleanup, { once: true });

  try {
    const transition = document.startViewTransition(navigate);
    await transition.ready;
    // Hold the snapshot on screen for the wave; our frame loop does the clipping.
    document.documentElement.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: wave.total + 500,
      pseudoElement: "::view-transition-old(root)",
    });
    const ctx = canvas.getContext("2d");
    const t0 = performance.now();
    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const t = now - t0;
        rule.style.clipPath = clipPathAt(wave, t);
        if (ctx) paintFlashes(ctx, wave, t, color, width, height);
        if (t < wave.total) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    // Everything is clipped away; ending the transition now is seamless.
    transition.skipTransition();
    await transition.finished;
  } catch {
    // The transition was skipped (hidden document, etc.). The route change
    // still happened; just make sure nothing is left behind.
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
