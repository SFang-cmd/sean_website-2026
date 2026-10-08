"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import { usePlainEnabled } from "@/lib/plainStore";
import { useReducedMotion } from "@/lib/motion";
import { loaderFor, srcFor } from "./photoLoader";
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
 * QA hook: `?motion=raf` forces the rAF fallback in a supporting browser.
 */

// Angle sign/multiplier, lane across the width, vertical speed (1 = the page's
// speed; the (2 − speed) factor below is what makes the streams parallax).
/** Shots mounted immediately; the rest follow after MOUNT_REST_AFTER_MS. */
const INITIAL_SHOTS = 8;
const MOUNT_REST_AFTER_MS = 400;
const STREAMS = [
  { angleMul: +1.0, lane: 0.42, speed: 1.0 },
  { angleMul: -1.0, lane: 0.58, speed: 0.86 },
  { angleMul: +0.5, lane: 0.5, speed: 0.74 },
];
const ANGLE = 18;
const PHONE_ANGLE = 12;
const PHONE_MAX = 767; // px; below this the streams go ~90vw and 12°
const STEP_Y = 640; // base vertical spacing, shared across streams
const SIZES = "(max-width: 767px) 90vw, (max-width: 1225px) 56vw, 690px";

// A little irregularity in spacing and size so it never reads as a conveyor belt.
const jitterY = (i: number) => ((i * 37) % 100) / 100;
const jitterS = (i: number) => 0.85 + (((i * 53) % 100) / 100) * 0.3;

type Mode = "css" | "raf";

function Caption({ photo }: { photo: Photo }) {
  return (
    <figcaption className="mt-1.5 whitespace-nowrap text-[11px] text-muted">
      <i className="font-serif text-[14px] italic text-fg">{photo.title}</i> · {photo.place} ·{" "}
      {photo.year}
    </figcaption>
  );
}

export function Streams({ photos }: { photos: Photo[] }) {
  const plain = usePlainEnabled();
  const reduced = useReducedMotion();
  if (plain || reduced) return <PlainList photos={photos} />;
  return <River photos={photos} />;
}

function PlainList({ photos }: { photos: Photo[] }) {
  return (
    <section className="px-7 pb-24" aria-label="Selected photos">
      <ul className="max-w-[760px] space-y-14">
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure className="m-0">
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
              <Caption photo={p} />
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

function River({ photos }: { photos: Photo[] }) {
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
    const n = STREAMS.length;
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
      const riverTop = river.getBoundingClientRect().top + window.scrollY;
      const tans: number[] = [];
      const lags: number[] = [];
      // Streams advance together: every shot steps the shared y cursor, so the
      // sequence reads top-to-bottom across streams (interleaved), not one
      // stream after another.
      let y = 0;
      let maxY = 0;
      shots.forEach((el, i) => {
        if (!el) return;
        const def = STREAMS[i % n];
        const tan = Math.tan((angle * def.angleMul * Math.PI) / 180);
        const speed = def.speed;
        const laneX = vw * def.lane;
        const w = phone
          ? vw * 0.9 * (0.92 + ((jitterS(i) - 0.85) / 0.3) * 0.08)
          : Math.min(vw * 0.62, 760) * 0.78 * jitterS(i);
        // scrollY at which this shot sits ~40% down the viewport, given that
        // it moves by scroll·(speed − 1) on top of the page's own scroll.
        const centeredAtScroll = (riverTop + y - vh * 0.4) / (2 - speed);
        el.style.width = `${w}px`;
        el.style.left = `${Math.round(laneX - w / 2 + centeredAtScroll * tan * speed)}px`;
        el.style.top = `${Math.round(y)}px`;
        tans[i] = tan * speed;
        lags[i] = speed - 1;
        maxY = Math.max(maxY, y / (2 - speed));
        y += (STEP_Y / n) * (0.7 + jitterY(i) * 0.8);
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
          ref={(el) => {
            shotRefs.current[i] = el;
          }}
          className={styles.shot}
          data-mode={mode ?? undefined}
          style={{ zIndex: i + 1 }}
        >
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
          <Caption photo={p} />
        </figure>
      ))}
    </section>
  );
}
