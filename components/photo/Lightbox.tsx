"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import { usePlainEnabled } from "@/lib/plainStore";
import { useReducedMotion } from "@/lib/motion";
import { loaderFor, srcFor } from "./photoLoader";
import styles from "./Lightbox.module.css";

/**
 * Native <dialog> lightbox, shared by the gallery and the home streams.
 * `showModal()` gives us the top layer, Esc, a focus trap and an inert page
 * for free; we add ←/→, prev/next buttons, backdrop-click close, a body
 * scroll lock and a touch swipe.
 *
 * One look everywhere: a solid neutral near-black (#141414, not #000, so a
 * photo with a black background keeps its edge), the photo alone at the
 * largest size that fits, a close button, and a bottom band: the caption and
 * counter centred, over the filmstrip. No zoom: the largest rendition is
 * 1600 px (2400 for landscapes), sized for the fit view, and enlarging it
 * only shows the resampling; phones keep the browser's pinch. Stepping: on
 * each side, the empty stage beside the photo plus the outer fifth of the
 * photo is a prev/next zone (the cursor becomes an arrow there) — the side
 * you are on is the way you go, whatever the photo's shape — plus ←/→ and
 * a touch swipe. The stage is inset from the viewport by a gutter (the CSS
 * `--gutter` / `--gutter-top`), so the photo never touches the edges.
 * Closing is the ×, Esc, or a click on the empty stage above/below a photo
 * or anywhere in the gutter. With `filmstrip`, the band also holds a
 * row of thumbnails: the current one outlined, click to jump, the row kept
 * centred on it; on pointer devices it fades out after a short idle and comes
 * back on any movement or key.
 *
 * One close path: every way out (Esc, backdrop, the close button, the
 * parent dropping the index) ends in the native `close` event, and only that
 * event calls `onClosed`, so the parent's cleanup (hash, focus return)
 * runs exactly once whichever way the dialog went.
 *
 * Open/close is a 180 ms fade unless plaintext mode or reduced motion is on
 * (then nothing fades, and the filmstrip never hides). The previous and next
 * photos are fetched while one is open.
 */
export function Lightbox({
  photos,
  index,
  onNav,
  onClosed,
  filmstrip = false,
}: {
  photos: Photo[];
  /** Index into `photos` of the open photo; −1 when closed. */
  index: number;
  onNav: (delta: number) => void;
  /** Fired after the dialog has actually closed, whatever closed it. */
  onClosed: () => void;
  /** Show the thumbnail strip (when there is more than one photo). */
  filmstrip?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const plain = usePlainEnabled();
  const reduced = useReducedMotion();
  const fade = !plain && !reduced;
  const photo = index >= 0 ? photos[index] : null;
  const count = photos.length;
  const open = photo !== null;
  const close = () => ref.current?.close();

  // Keep the last photo through the close fade, so the image doesn't vanish
  // a frame before the backdrop does.
  const last = useRef<Photo | null>(null);
  if (photo) last.current = photo;
  const shown = photo ?? last.current;

  const strip = filmstrip && count > 1;

  const neighbours =
    index >= 0 && count > 1
      ? [photos[(index + 1) % count], photos[(index - 1 + count) % count]].filter(
          (p, i, a) => p.id !== photo?.id && a.indexOf(p) === i,
        )
      : [];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal() focuses the first control, except on a direct load with
      // `#<id>` where the fragment navigation can leave focus on <body>.
      if (!el.contains(document.activeElement)) el.querySelector("button")?.focus();
    } else if (!open && el.open) el.close();
  }, [open]);

  // ←/→ on the document, not the dialog, so they work wherever focus sits
  // (the page under a modal dialog is inert, so nothing else can want them).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNav(1);
      else if (e.key === "ArrowLeft") onNav(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onNav]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("close", onClosed);
    return () => el.removeEventListener("close", onClosed);
  }, [onClosed]);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Filmstrip idle: hide after IDLE_MS without input; any pointer movement,
  // key or step brings it back. Only when motion is allowed (otherwise it
  // stays), and the CSS limits the hide to hover-capable devices.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!open || !strip || !fade) return;
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), IDLE_MS);
    };
    wake();
    const events = ["pointermove", "pointerdown", "keydown"] as const;
    for (const ev of events) window.addEventListener(ev, wake);
    return () => {
      clearTimeout(t);
      for (const ev of events) window.removeEventListener(ev, wake);
      setIdle(false);
    };
  }, [open, strip, fade, index]);

  // Keep the current thumbnail centred in the strip.
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current;
    if (!el || index < 0) return;
    const thumb = el.children[index] as HTMLElement | undefined;
    if (!thumb) return;
    const left = thumb.offsetLeft - (el.clientWidth - thumb.offsetWidth) / 2;
    el.scrollTo({ left, behavior: fade ? "smooth" : "auto" });
  }, [index, fade, strip]);

  // Touch swipe steps.
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || (e.target as HTMLElement).closest("button")) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) onNav(dx < 0 ? 1 : -1);
  };

  const className = [styles.dialog, strip ? styles.hasStrip : "", fade ? styles.fade : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={shown?.alt ?? "Photo"}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
    >
      {shown && (
        <>
          <button
            type="button"
            onClick={close}
            className={`${styles.ctl} ${styles.close}`}
            aria-label="Close"
            autoFocus
          >
            ×
          </button>
          <Stage key={shown.id} photo={shown}>
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onNav(-1)}
                  className={`${styles.zone} ${styles.zonePrev}`}
                  aria-label="Previous photo"
                />
                <button
                  type="button"
                  onClick={() => onNav(1)}
                  className={`${styles.zone} ${styles.zoneNext}`}
                  aria-label="Next photo"
                />
              </>
            )}
          </Stage>
          <div className={styles.band}>
            <div className={styles.meta}>
              {shown.title && (
                <p className={styles.caption}>
                  <i className="font-serif text-[13px] italic text-white/85">{shown.title}</i>
                  {shown.place ? ` · ${shown.place}` : ""} · {shown.year}
                </p>
              )}
              {count > 1 && (
                <span className="tabular-nums" aria-live="polite">
                  {Math.max(index, 0) + 1} / {count}
                </span>
              )}
            </div>
            {strip && (
              <div
                ref={stripRef}
                className={`${styles.strip} ${idle ? styles.idle : ""}`}
                role="list"
                aria-label="Photos in this set"
              >
                {photos.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    role="listitem"
                    className={styles.thumb}
                    aria-current={i === index ? "true" : undefined}
                    aria-label={`Photo ${i + 1} of ${count}`}
                    tabIndex={idle ? -1 : 0}
                    onClick={() => onNav(i - index)}
                  >
                    <Image
                      loader={loaderFor(p)}
                      src={srcFor(p)}
                      alt=""
                      width={Math.round((THUMB_H * p.width) / p.height)}
                      height={THUMB_H}
                      sizes={`${THUMB_H * 2}px`}
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
      {open && neighbours.length > 0 && (
        <div className={styles.preload} aria-hidden="true">
          {neighbours.map((p) => (
            <Image
              key={p.id}
              loader={loaderFor(p)}
              src={srcFor(p)}
              alt=""
              width={p.width}
              height={p.height}
              sizes="100vw"
              loading="eager"
            />
          ))}
        </div>
      )}
    </dialog>
  );
}

const THUMB_H = 48;
const IDLE_MS = 2000;
const SWIPE_PX = 50;

/**
 * The stage: the photo centred at the largest size that fits above the band,
 * with any overlays (the prev/next zones) laid out inside it. Clicks on the
 * empty stage fall through to the dialog (= backdrop close); the photo itself
 * swallows them so a mis-click on it does nothing.
 */
function Stage({ photo, children }: { photo: Photo; children?: React.ReactNode }) {
  return (
    <div
      className={styles.stage}
      style={{ "--ar": `${photo.width} / ${photo.height}` } as React.CSSProperties}
    >
      <Image
        loader={loaderFor(photo)}
        src={srcFor(photo)}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes="100vw"
        placeholder="blur"
        blurDataURL={photo.blur}
        priority
        draggable={false}
        className={styles.full}
      />
      {children}
    </div>
  );
}
