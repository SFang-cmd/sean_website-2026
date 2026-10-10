/**
 * The B home as a depth field: every shot moves straight up at its own
 * speed; depth drives size, speed and stacking (nearer = bigger, faster, on
 * top). Pure layout, no DOM: the River (components/photo/Streams.tsx) feeds
 * the result into its existing scroll-driven transforms. Prototype and
 * knob rationale: docs/prototypes/b-home-field.html.
 *
 * Placement, per shot in sequence:
 *  - depth: stratified (one distinct value per shot), shuffled by the seed;
 *  - entry: the shot enters at the bottom edge the moment the projected
 *    viewport fill (looked at a third of a viewport ahead) drops under the
 *    target, so the stream never arrives in waves;
 *  - x: best of N candidates (Mitchell's best-candidate = blue noise: reward
 *    distance from what is already placed) scored against the coverage rule:
 *    while a shot's centre is inside the middle band of the viewport, no more
 *    than `cap` of it may be hidden by nearer shots at ANY scroll position.
 * `bestFieldLayout` runs several seeds and keeps the lowest worst case.
 */

import { theme } from "@/config/theme";
import type { HomeLayout, HomeLayoutFn, HomeLayoutInput } from "@/lib/homeLayout";

export interface FieldKnobs {
  /** Speed of the nearest / farthest shot, 1 = the page's own scroll speed. */
  fast: number;
  slow: number;
  /** Width in vw of the nearest / farthest shot. */
  big: number;
  small: number;
  /**
   * Width multiplier for landscapes, so a far landscape doesn't read as a
   * thumbnail next to a portrait of the same width (equal visual mass is
   * about ×1.22; Sean wanted more).
   */
  landscapeScale: number;
  /** Target share of the viewport covered by photos at any scroll position. */
  fill: number;
  /** Middle band of the viewport height in which a shot must stay prominent. */
  band: number;
  /** Max fraction of a shot hidden by nearer shots while it is in the band. */
  cap: number;
  /** Candidate positions tried per shot. */
  candidates: number;
  /** Seeds tried by bestFieldLayout. */
  seeds: number;
  /** First seed is seedOffset + 1: bump to "reroll" into a different family of layouts. */
  seedOffset: number;
}

export interface FieldShot {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Depth 0..1; also the stacking order. */
  d: number;
  speed: number;
  /** Worst in-band coverage this shot suffers, 0..1 (diagnostic). */
  covered: number;
}

export interface FieldLayout {
  shots: FieldShot[];
  /** River height in px so the slowest, lowest shot has left before the next section. */
  height: number;
  seed: number;
  worst: number;
  fillMin: number;
  /** Peak fill over the scroll (bunching shows up as a spike). */
  fillMax: number;
  /** Worst left/right imbalance of on-screen area, 0 = even, 1 = everything on one side. */
  lopsided: number;
}

interface Dim {
  width: number;
  height: number;
}
type Box = { x: number; y: number; w: number; h: number; d: number; speed: number };

/** mulberry32 */
function rng(seed: number): () => number {
  let a = (seed * 1337 + 1) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function layoutField(
  photos: Dim[],
  W: number,
  H: number,
  riverTop: number,
  k: FieldKnobs,
  seed: number,
): FieldLayout {
  const R = riverTop;
  const rand = rng(seed);
  const screenTop = (s: Box, sc: number) => R + s.y - sc * s.speed;
  const visRange = (s: Box): [number, number] => [(R + s.y - H) / s.speed, (R + s.y + s.h) / s.speed];
  const inBand = (s: Box, sc: number) => {
    const c = screenTop(s, sc) + s.h / 2;
    return c > (H * (1 - k.band)) / 2 && c < (H * (1 + k.band)) / 2;
  };
  // Fraction of the farther shot covered by the nearer one at scroll sc.
  const overlapFrac = (a: Box, b: Box, sc: number) => {
    const far = a.d < b.d ? a : b;
    const near = far === a ? b : a;
    const fy = screenTop(far, sc);
    const ny = screenTop(near, sc);
    const ox = Math.max(0, Math.min(far.x + far.w, near.x + near.w) - Math.max(far.x, near.x));
    const oy = Math.max(0, Math.min(fy + far.h, ny + near.h) - Math.max(fy, ny));
    return (ox * oy) / (far.w * far.h);
  };
  // Largest fraction of the farther shot covered at any scroll where it is in the band.
  const coveredInBand = (a: Box, b: Box) => {
    const far = a.d < b.d ? a : b;
    const [a0, a1] = visRange(a);
    const [b0, b1] = visRange(b);
    const s0 = Math.max(a0, b0);
    const s1 = Math.min(a1, b1);
    if (s1 <= s0) return 0;
    let m = 0;
    for (let i = 0; i <= 40; i++) {
      const sc = lerp(s0, s1, i / 40);
      if (inBand(far, sc)) m = Math.max(m, overlapFrac(a, b, sc));
    }
    return m;
  };
  const placed: Box[] = [];
  const fillAt = (sc: number) => {
    let area = 0;
    for (const o of placed) {
      const t = screenTop(o, sc);
      area += Math.max(0, Math.min(t + o.h, H) - Math.max(t, 0)) * o.w;
    }
    return area / (W * H);
  };
  // Share of on-screen area left of the viewport's centre line (0.5 = even).
  const leftShareAt = (sc: number) => {
    let left = 0;
    let all = 0;
    for (const o of placed) {
      const t = screenTop(o, sc);
      const vis = Math.max(0, Math.min(t + o.h, H) - Math.max(t, 0));
      if (!vis) continue;
      const lw = Math.max(0, Math.min(o.x + o.w, W / 2) - Math.max(o.x, 0));
      left += vis * lw;
      all += vis * o.w;
    }
    return all ? left / all : 0.5;
  };

  const n = photos.length;
  const depths = photos.map((_, i) => (i + 0.5) / n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [depths[i], depths[j]] = [depths[j], depths[i]];
  }

  // Start "before" scroll 0 so the first shots already sit in the fold.
  let sEntry = -H;
  const ahead = 0.35 * H;
  photos.forEach((p, i) => {
    const d = depths[i];
    const land = p.width > p.height;
    const w = Math.round(Math.min(W * 0.94, (W * lerp(k.small, k.big, d) * (land ? k.landscapeScale : 1)) / 100));
    const h = Math.round((w * p.height) / p.width);
    const speed = lerp(k.slow, k.fast, d);
    let s = sEntry;
    while (s < 60000 && fillAt(s + ahead) >= k.fill) s += 10;
    const yEnter = Math.max(0, H + s * speed - R);
    let best: (Box & { cost: number }) | null = null;
    for (let c = 0; c < k.candidates; c++) {
      const x = Math.round(rand() * (W - w));
      const late = rand() * 0.25 * H;
      const y = Math.round(yEnter + late);
      const cand: Box = { x, y, w, h, d, speed };
      let cost = (late / H) * 2;
      let minD = Infinity;
      for (const o of placed) {
        const m = coveredInBand(cand, o);
        cost += m * m * 10 + (m > k.cap ? 12 : 0);
        const dx = (x + w / 2 - (o.x + o.w / 2)) / W;
        const dy = (y + h / 2 - (o.y + o.h / 2)) / H;
        if (Math.abs(dy) < 1.5) minD = Math.min(minD, Math.hypot(dx, dy));
      }
      if (minD !== Infinity) cost -= Math.min(minD, 0.6) * 6;
      if (!best || cost < best.cost) best = { ...cand, cost };
    }
    const b = best!;
    sEntry = (R + b.y - H) / b.speed;
    placed.push({ x: b.x, y: b.y, w, h, d, speed });
  });

  // Diagnostics: worst in-band coverage per shot (all nearer shots summed), fill profile.
  let worst = 0;
  const shots: FieldShot[] = placed.map((a) => {
    const [v0, v1] = visRange(a);
    let m = 0;
    for (let i = 0; i <= 60; i++) {
      const sc = lerp(v0, v1, i / 60);
      if (!inBand(a, sc)) continue;
      let tot = 0;
      for (const b of placed) if (b !== a && b.d > a.d) tot += overlapFrac(a, b, sc);
      m = Math.max(m, Math.min(1, tot));
    }
    worst = Math.max(worst, m);
    return { ...a, covered: m };
  });
  const end = Math.max(...placed.map((s) => (R + s.y + s.h) / s.speed));
  const lastOut = end;
  // Fill profile from the point where the river fills the lower half of the
  // viewport (the hero owns the fold above that) until the last shot leaves.
  let fillMin = 1;
  let fillMax = 0;
  let lopsided = 0;
  for (let sc = Math.max(0, R - H / 2); sc <= lastOut - H; sc += 20) {
    const f = fillAt(sc);
    fillMin = Math.min(fillMin, f);
    fillMax = Math.max(fillMax, f);
    if (f > 0.15) lopsided = Math.max(lopsided, Math.abs(leftShareAt(sc) - 0.5) * 2);
  }
  return { shots, height: Math.round(end - R + 80), seed, worst, fillMin, fillMax, lopsided };
}

/**
 * Try `k.seeds` seeds, keep the best: the coverage cap first, then an even
 * page (no fill dips, no bunching spikes, no stretch with everything on one
 * side).
 */
export function bestFieldLayout(photos: Dim[], W: number, H: number, riverTop: number, k: FieldKnobs): FieldLayout {
  let best: FieldLayout | null = null;
  let bestKey = Infinity;
  for (let seed = k.seedOffset + 1; seed <= k.seedOffset + k.seeds; seed++) {
    const l = layoutField(photos, W, H, riverTop, k, seed);
    const over = l.shots.filter((s) => s.covered > k.cap).length;
    const key = over * 10 + l.worst - l.fillMin * 0.5 + Math.max(0, l.fillMax - 0.7) * 2 + l.lopsided * 0.6;
    if (key < bestKey) {
      bestKey = key;
      best = l;
    }
  }
  return best!;
}

/** The pluggable-layout adapter (lib/homeLayout.ts): knobs from `theme.home.field`. */
export const layoutHomeField: HomeLayoutFn = ({ photos, W, H, riverTop, phone }: HomeLayoutInput): HomeLayout => {
  const k = phone ? theme.home.field.phone : theme.home.field.desktop;
  const field = bestFieldLayout(photos, W, H, riverTop, k);
  return {
    shots: field.shots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, z: Math.round(s.d * 100) + 1, speed: s.speed, tan: 0 })),
    height: field.height,
    readout: `seed ${field.seed} worst ${Math.round(field.worst * 100)}% fill ${Math.round(field.fillMin * 100)}-${Math.round(field.fillMax * 100)}% lopsided ${Math.round(field.lopsided * 100)}%`,
  };
};
