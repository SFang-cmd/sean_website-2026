"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import { usePlainEnabled } from "@/lib/plainStore";
import { useReducedMotion } from "@/lib/motion";
import { homeLayouts, type HomeLayoutName } from "@/lib/homeLayout";
import { theme } from "@/config/theme";
import { loaderFor, srcFor } from "./photoLoader";
import { Lightbox } from "./Lightbox";
import { useLightbox } from "./useLightbox";
import styles from "./Streams.module.css";

/**
 * The B home river. Placement is pluggable (lib/homeLayout.ts): `field`
 * (photos drifting straight up at their own speeds, lib/homeField.ts) or
 * `streams` (three interleaved lanes crossing at ~18°, lib/homeStreams.ts),
 * chosen by `theme.home.layout` or `?home=<name>` for QA. Every layout
 * returns boxes + drift factors; this component owns the motion.
 *
 * Layout (positions, sizes, per-shot drift) is computed once per resize, not
 * per scroll frame. Motion is one transform per shot: a CSS scroll-driven
 * animation where `animation-timeline: scroll()` is supported, otherwise a
 * single passive scroll listener + one rAF that writes the transforms.
 * Reduced motion and plaintext mode render a plain single-column list.
 *
 * Every shot is a <button> opening the photo in the Lightbox (fit to
 * the viewport, ←/→ through the home sequence, `#<id>` deep links). The
 * button sits inside the <figure> that carries the scroll-driven transform,
 * so it rides along without touching the motion; it has no touch-action of
 * its own, so a drag over it still scrolls the page.
 *
 * QA hooks: `?motion=raf` forces the rAF fallback in a supporting browser;
 * `?home=field|streams` overrides the layout.
 */

/** Shots mounted immediately; the rest follow after MOUNT_REST_AFTER_MS. */
const INITIAL_SHOTS = 8;
const MOUNT_REST_AFTER_MS = 400;
const PHONE_MAX = 767; // px; below this layouts use their phone variant
const SIZES = "(max-width: 767px) 90vw, (max-width: 1225px) 56vw, 690px";

type Mode = "css" | "raf";

function layoutName(): HomeLayoutName {
  const q = new URLSearchParams(window.location.search).get("home");
  return q && q in homeLayouts ? (q as HomeLayoutName) : theme.home.layout;
}
type Open = (id: string, from: HTMLElement) => void;

/**
 * `photos` is the home set (photos/home/, filename order): what the streams
 * show and what the lightbox steps through, with the filmstrip.
 */
export function Streams({ photos }: { photos: Photo[] }) {
  const plain = usePlainEnabled();
  const reduced = useReducedMotion();
  const { index, list, open, nav, closed } = useLightbox(photos);
  return (
    <>
      {plain || reduced ? (
        <PlainList photos={photos} onOpen={open} />
      ) : (
        <River photos={photos} onOpen={open} />
      )}
      <Lightbox photos={list} index={index} onNav={nav} onClosed={closed} filmstrip />
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
      const riverTop = river.getBoundingClientRect().top + window.scrollY;
      // Laid out for the whole set (dimensions come from the manifest, not
      // the DOM), so the first screenful doesn't move when the rest mounts.
      const result = homeLayouts[layoutName()]({ photos, W: vw, H: vh, riverTop, phone });
      const tans: number[] = [];
      const lags: number[] = [];
      shots.forEach((el, i) => {
        if (!el) return;
        const sh = result.shots[i];
        el.style.width = `${sh.w}px`;
        el.style.left = `${sh.x}px`;
        el.style.top = `${sh.y}px`;
        el.style.zIndex = `${sh.z}`;
        tans[i] = sh.tan;
        // y = scroll·lag on top of the page's own motion: speed > 1 climbs faster.
        lags[i] = 1 - sh.speed;
      });
      drift.current = { tan: tans, lag: lags };
      river.style.setProperty("--river-h", `${result.height}px`);
      if (result.readout) river.dataset.field = result.readout;
      else delete river.dataset.field;
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
