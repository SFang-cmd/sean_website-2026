import { layoutHomeField } from "@/lib/homeField";
import { layoutHomeStreams } from "@/lib/homeStreams";

/**
 * The B home river's placement is pluggable: every layout is a pure function
 * from the photo set and the viewport to per-shot boxes and drift factors,
 * and components/photo/Streams.tsx applies the result to the same motion
 * machinery (one scroll-driven transform per shot). Pick one with
 * `theme.home.layout`, or `?home=<name>` on the URL for side-by-side QA.
 */
export interface HomeLayoutInput {
  /** Natural dimensions of every home photo, in stream order. */
  photos: { width: number; height: number }[];
  /** Viewport width/height in CSS px. */
  W: number;
  H: number;
  /** Page-y of the river's top edge (the hero sits above it). */
  riverTop: number;
  /** Narrow layout (≤ PHONE_MAX). */
  phone: boolean;
}

export interface HomeShot {
  /** Box inside the river, in px. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Stacking order. */
  z: number;
  /** Vertical speed, 1 = the page's own scroll speed, > 1 climbs faster. */
  speed: number;
  /** Sideways drift per px of scroll (0 = straight up). */
  tan: number;
}

export interface HomeLayout {
  shots: HomeShot[];
  /** River height in px: the last shot has left before the next section arrives. */
  height: number;
  /** Optional one-line QA readout, exposed as `data-field` on the river. */
  readout?: string;
}

export type HomeLayoutFn = (input: HomeLayoutInput) => HomeLayout;

export const homeLayouts = {
  field: layoutHomeField,
  streams: layoutHomeStreams,
} satisfies Record<string, HomeLayoutFn>;

export type HomeLayoutName = keyof typeof homeLayouts;
