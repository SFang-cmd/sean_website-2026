import { theme } from "@/config/theme";
import type { HomeLayout, HomeLayoutFn, HomeLayoutInput } from "@/lib/homeLayout";

/**
 * The original B home: three interleaved streams of photos crossing the page
 * at ~18°, parallaxed against each other (prototype docs/prototypes/b-home.html).
 * Pure port of the placement that used to live inside the River; knobs in
 * `theme.home.streams`.
 *
 * Streams advance together: every shot steps a shared y cursor, so the
 * sequence reads top-to-bottom across streams (interleaved), not one stream
 * after another. Within a stream, a shot can never start above the previous
 * shot's bottom plus a gap, so tall portraits don't get a landscape dropped
 * onto them.
 */

// A little irregularity in spacing and size so it never reads as a conveyor belt.
const jitterY = (i: number) => ((i * 37) % 100) / 100;
const jitterS = (i: number) => 0.85 + (((i * 53) % 100) / 100) * 0.3;

export const layoutHomeStreams: HomeLayoutFn = ({ photos, W, H, riverTop, phone }: HomeLayoutInput): HomeLayout => {
  const k = theme.home.streams;
  const angle = phone ? k.phoneAngle : k.angle;
  const defs = phone ? k.phoneLanes : k.lanes;
  const n = defs.length;
  let y = 0;
  let maxY = 0;
  const streamBottom = new Array<number>(n).fill(-Infinity);
  const shots = photos.map((p, i) => {
    const def = defs[i % n];
    const tan = Math.tan((angle * def.angleMul * Math.PI) / 180);
    // Lane speeds are written as "lag" (1 = page speed, 0.86 = climbs 14%
    // faster); the shared contract wants speed, so convert.
    const speed = 2 - def.speed;
    const laneX = W * def.lane;
    const landscape = p.width > p.height;
    // Size by orientation so a landscape has roughly the same visual mass
    // as a portrait (otherwise landscapes read as thumbnails).
    const w = phone
      ? W * (landscape ? 0.92 : 0.8) * (0.96 + ((jitterS(i) - 0.85) / 0.3) * 0.04)
      : (landscape ? Math.min(W * 0.36, 540) : Math.min(W * 0.3, 440)) * jitterS(i);
    const h = (w * p.height) / p.width;
    const gap = phone ? 48 + jitterY(i) * 40 : 120 + jitterY(i) * 80;
    const top = Math.max(y, streamBottom[i % n] + gap);
    // scrollY at which this shot sits ~40% down the viewport, given that it
    // moves at `speed` times the page's own scroll.
    const centeredAtScroll = (riverTop + top - H * 0.4) / speed;
    const drift = tan * (2 - speed); // sideways px per px of scroll (the old tan·lag)
    streamBottom[i % n] = top + h;
    maxY = Math.max(maxY, (top + h) / speed);
    y = Math.max(y + (k.stepY / n) * (0.7 + jitterY(i) * 0.8), top);
    return {
      x: Math.round(laneX - w / 2 + centeredAtScroll * drift),
      y: Math.round(top),
      w,
      h,
      z: i + 1,
      speed,
      tan: drift,
    };
  });
  return { shots, height: Math.round(maxY + H * 0.6) };
};
