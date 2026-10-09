"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import { usePlainEnabled } from "@/lib/plainStore";
import { useReducedMotion } from "@/lib/motion";
import { loaderFor, srcFor } from "./photoLoader";
import { Lightbox } from "./Lightbox";
import { useLightbox } from "./useLightbox";
import styles from "./Streams.module.css";

/**
 * The B home: three interleaved streams of photos crossing the page at ~18°,
 * parallaxed against each other. Port of docs/prototypes/b-home.html.
 *
 * Layout (positions, sizes, per-shot drift) is computed once per resize, not
 * per scroll frame. Motion is one transform per shot: a CSS scroll-driven
 * animation where `animation-timeline: scroll()` is supported, otherwise a
 * single passive scroll listener + one rAF that writes the transforms.
 * Reduced motion and plaintext mode render a plain single-column list.
 *
 * Every shot is a <button> opening the photo in the black Lightbox (fit to
 * the viewport, ←/→ through the home sequence, `#<id>` deep links). The
 * button sits inside the <figure> that carries the scroll-driven transform,
 * so it rides along without touching the motion; it has no touch-action of
 * its own, so a drag over it still scrolls the page.
 *
 * QA hook: `?motion=raf` forces the rAF fallback in a supporting browser.
 */

// Angle sign/multiplier, lane across the width, vertical speed (1 = the page's
// speed; the (2 − speed) factor below is what makes the streams parallax).
/** Shots mounted immediately; the rest follow after MOUNT_REST_AFTER_MS. */
const INITIAL_SHOTS = 8;
const MOUNT_REST_AFTER_MS = 400;
// Lanes sit apart (22% / 50% / 78%) and images are ~30vw so the streams drift
// without covering each other; earlier lanes at 42/58 with ~48vw images
// overlapped too much with real photos.
const STREAMS = [
  { angleMul: +1.0, lane: 0.22, speed: 1.0 },
  { angleMul: -1.0, lane: 0.78, speed: 0.86 },
  { angleMul: +0.5, lane: 0.5, speed: 0.74 },
];
const ANGLE = 18;
const PHONE_ANGLE = 12;
/** Below PHONE_MAX: a single centred stream (three lanes can't fit without stacking). */
const PHONE_STREAMS = [{ angleMul: +1.0, lane: 0.5, speed: 1.0 }];
const PHONE_MAX = 767; // px; below this the streams go ~90vw and 12°
const STEP_Y = 640; // base vertical spacing, shared across streams
const SIZES = "(max-width: 767px) 90vw, (max-width: 1225px) 56vw, 690px";

// A little irregularity in spacing and size so it never reads as a conveyor belt.
const jitterY = (i: number) => ((i * 37) % 100) / 100;
const jitterS = (i: number) => 0.85 + (((i * 53) % 100) / 100) * 0.3;

type Mode = "css" | "raf";
type Open = (id: string, from: HTMLElement) => void;

export function Streams({ photos }: { photos: Photo[] }) {
  const plain = usePlainEnabled();
  const reduced = useReducedMotion();
  const { index, open, nav, closed } = useLightbox(photos);
  return (
    <>
      {plain || reduced ? (
        <PlainList photos={photos} onOpen={open} />
      ) : (
        <River photos={photos} onOpen={open} />
      )}
      <Lightbox variant="black" photos={photos} index={index} onNav={nav} onClosed={closed} />
    </>
  );
}

function PlainList({ photos, onOpen }: { photos: Photo[]; onOpen: Open }) {
  return (
    <section className="px-7 pb-24" aria-label="Selected photos">
      <ul className="max-w-[760px] space-y-14">
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure id={p.id} className="m-0">
              <button
                type="button"
                className={styles.open}
                onClick={(e) => onOpen(p.id, e.currentTarget)}
              >
                <Image
                  loader={loaderFor(p)}
                  src={srcFor(p)}
                  alt={p.alt}
                  width={p.width}
                  height={p.height}
                  sizes="(max-width: 815px) calc(100vw - 56px), 760px"
                  placeholder="blur"
                  blurDataURL={p.blur}
                  priority={i < 2}
                  className="h-auto w-full"
                />
              </button>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

function River({ photos, onOpen }: { photos: Photo[]; onOpen: Open }) {
  const riverRef = useRef<HTMLElement>(null);
  const shotRefs = useRef<(HTMLElement | null)[]>([]);
  // Per-shot drift factors from the last layout: x = −scroll·tan, y = scroll·lag.
  const drift = useRef<{ tan: number[]; lag: number[] }>({ tan: [], lag: [] });
  const [mode, setMode] = useState<Mode | null>(null);
  // Progressive mount: the first screenful of shots renders at once, the rest
  // a beat later. Mounting all 36 images in one go blocks the main thread
  // right when the A→B wave is painting over this page.
  const [count, setCount] = useState(Math.min(INITIAL_SHOTS, photos.length));
  useEffect(() => {
    if (count >= photos.length) return;
    const id = window.setTimeout(() => setCount(photos.length), MOUNT_REST_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [count, photos.length]);

  useLayoutEffect(() => {
    const forceRaf = new URLSearchParams(window.location.search).get("motion") === "raf";
    const css = !forceRaf && CSS.supports("animation-timeline: scroll()");
    setMode(css ? "css" : "raf");
  }, []);

  useLayoutEffect(() => {
    if (!mode) return;
    const river = riverRef.current!;
    const shots = shotRefs.current;
    let last = { w: 0, h: 0 };

    const apply = (scroll: number) => {
      const { tan, lag } = drift.current;
      shots.forEach((el, i) => {
        if (el) el.style.transform = `translate3d(${-scroll * tan[i]}px, ${scroll * lag[i]}px, 0)`;
      });
    };

    const layout = () => {
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const phone = vw <= PHONE_MAX;
      const angle = phone ? PHONE_ANGLE : ANGLE;
      const defs = phone ? PHONE_STREAMS : STREAMS;
      const n = defs.length;
      const riverTop = river.getBoundingClientRect().top + window.scrollY;
      const tans: number[] = [];
      const lags: number[] = [];
      // Streams advance together: every shot steps the shared y cursor, so the
      // sequence reads top-to-bottom across streams (interleaved), not one
      // stream after another. Within a stream, a shot can never start above
      // the previous shot's bottom plus a gap, so tall portraits don't get a
      // landscape dropped onto them.
      let y = 0;
      let maxY = 0;
      const streamBottom = new Array(n).fill(-Infinity);
      shots.forEach((el, i) => {
        if (!el) return;
        const p = photos[i];
        const def = defs[i % n];
        const tan = Math.tan((angle * def.angleMul * Math.PI) / 180);
        const speed = def.speed;
        const laneX = vw * def.lane;
        const landscape = p.width > p.height;
        // Size by orientation so a landscape has roughly the same visual mass
        // as a portrait (otherwise landscapes read as thumbnails).
        const w = phone
          ? vw * (landscape ? 0.92 : 0.8) * (0.96 + ((jitterS(i) - 0.85) / 0.3) * 0.04)
          : (landscape ? Math.min(vw * 0.36, 540) : Math.min(vw * 0.3, 440)) * jitterS(i);
        const h = (w * p.height) / p.width;
        const gap = phone ? 48 + jitterY(i) * 40 : 120 + jitterY(i) * 80;
        const top = Math.max(y, streamBottom[i % n] + gap);
        // scrollY at which this shot sits ~40% down the viewport, given that
        // it moves by scroll·(speed − 1) on top of the page's own scroll.
        const centeredAtScroll = (riverTop + top - vh * 0.4) / (2 - speed);
        el.style.width = `${w}px`;
        el.style.left = `${Math.round(laneX - w / 2 + centeredAtScroll * tan * speed)}px`;
        el.style.top = `${Math.round(top)}px`;
        tans[i] = tan * speed;
        lags[i] = speed - 1;
        streamBottom[i % n] = top + h;
        maxY = Math.max(maxY, (top + h) / (2 - speed));
        y = Math.max(y + (STEP_Y / n) * (0.7 + jitterY(i) * 0.8), top);
      });
      drift.current = { tan: tans, lag: lags };
      river.style.setProperty("--river-h", `${Math.round(maxY + vh * 0.6)}px`);
      river.dataset.ready = "";
      // The CSS timeline runs over the whole scroll range, so the keyframe
      // end is the drift at max scroll; the transform is linear in scroll.
      const range = document.documentElement.scrollHeight - window.innerHeight;
      shots.forEach((el, i) => {
        if (!el) return;
        el.style.setProperty("--dx", `${-range * tans[i]}px`);
        el.style.setProperty("--dy", `${range * lags[i]}px`);
      });
      if (mode === "raf") apply(window.scrollY);
      last = { w: vw, h: vh };
    };

    layout();

    // Re-layout on width changes, and on height changes big enough to be a
    // rotation or window resize (not a phone URL bar collapsing mid-scroll).
    const onResize = () => {
      const w = document.documentElement.clientWidth;
      const h = window.innerHeight;
      if (w !== last.w || Math.abs(h - last.h) > 160) layout();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => apply(window.scrollY));
    };
    if (mode === "raf") window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [mode, count]);

  // Fonts loading late can change the hero's height and so the river's top.
  useEffect(() => {
    document.fonts?.ready.then(() => window.dispatchEvent(new Event("resize")));
  }, []);

  return (
    <section ref={riverRef} className={styles.river} aria-label="Selected photos">
      {photos.slice(0, count).map((p, i) => (
        <figure
          key={p.id}
          id={p.id}
          ref={(el) => {
            shotRefs.current[i] = el;
          }}
          className={styles.shot}
          data-mode={mode ?? undefined}
          style={{ zIndex: i + 1 }}
        >
          <button type="button" className={styles.open} onClick={(e) => onOpen(p.id, e.currentTarget)}>
            <Image
              loader={loaderFor(p)}
              src={srcFor(p)}
              alt={p.alt}
              width={p.width}
              height={p.height}
              sizes={SIZES}
              placeholder="blur"
              blurDataURL={p.blur}
              priority={i < 2}
            />
          </button>
        </figure>
      ))}
    </section>
  );
}
