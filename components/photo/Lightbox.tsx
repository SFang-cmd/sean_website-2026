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
 * largest size that fits, click-to-zoom (fit ↔ 2× about the clicked point,
 * drag to pan), small white controls, and a bottom band with the caption
 * (hidden while zoomed) and counter. With `filmstrip`, the band also holds a
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
  const [zoomed, setZoomed] = useState(false);

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

  // Touch swipe steps when not zoomed (zoomed, one finger pans the photo).
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || zoomed || (e.target as HTMLElement).closest("button")) return;
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || zoomed) return;
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
          <ZoomableImage key={shown.id} photo={shown} onZoomChange={setZoomed} />
          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => onNav(-1)}
                className={`${styles.ctl} ${styles.prev}`}
                aria-label="Previous photo"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => onNav(1)}
                className={`${styles.ctl} ${styles.next}`}
                aria-label="Next photo"
              >
                →
              </button>
            </>
          )}
          <div className={styles.band}>
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
            <div className={styles.meta}>
              <p className={`${styles.caption} ${zoomed ? styles.captionHidden : ""}`}>
                <i className="font-serif text-[13px] italic text-white/85">{shown.title}</i>
                {shown.place ? ` · ${shown.place}` : ""} · {shown.year}
              </p>
              {count > 1 && (
                <span className="tabular-nums" aria-live="polite">
                  {Math.max(index, 0) + 1} / {count}
                </span>
              )}
            </div>
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

const ZOOM = 2;
const THUMB_H = 48;
const IDLE_MS = 2000;
const SWIPE_PX = 50;

/** Zoom state: origin and pan in px, plus the fitted image's box so panning
    can be clamped to the viewport without re-measuring a transformed element. */
interface Zoom {
  ox: number;
  oy: number;
  tx: number;
  ty: number;
  left: number;
  top: number;
  w: number;
  h: number;
}

/**
 * The photo. Click toggles fit ↔ 2× scaled about the clicked point (so that
 * spot stays put); while zoomed, dragging pans, clamped so the photo never
 * leaves the stage. The drag writes the transform straight to the element
 * and commits to state on release. Pinch gestures are left to the browser
 * (`touch-action: pinch-zoom`).
 */
function ZoomableImage({
  photo,
  onZoomChange,
}: {
  photo: Photo;
  onZoomChange?: (zoomed: boolean) => void;
}) {
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onZoomChange?.(zoom !== null);
  }, [zoom, onZoomChange]);
  // Remounted per photo (key={id}), so report "not zoomed" when going away.
  useEffect(() => () => onZoomChange?.(false), [onZoomChange]);

  const transform = (z: Zoom) => `translate(${z.tx}px, ${z.ty}px) scale(${ZOOM})`;
  const clamp = (z: Zoom) => clampPan(z, stageRef.current?.getBoundingClientRect() ?? null);

  const onClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    if (zoom) {
      setZoom(null);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    setZoom(
      clamp({
        ox: e.clientX - r.left,
        oy: e.clientY - r.top,
        tx: 0,
        ty: 0,
        left: r.left,
        top: r.top,
        w: r.width,
        h: r.height,
      }),
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (!zoom || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, tx: zoom.tx, ty: zoom.ty, moved: false };
    setPanning(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    const d = drag.current;
    if (!d || !zoom) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    if (!d.moved) return;
    const z = clamp({ ...zoom, tx: d.tx + dx, ty: d.ty + dy });
    d.tx = z.tx - dx;
    d.ty = z.ty - dy;
    e.currentTarget.style.transform = transform(z);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    const d = drag.current;
    if (!d || !zoom) return;
    drag.current = null;
    setPanning(false);
    if (d.moved) {
      suppressClick.current = true;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      setZoom(clamp({ ...zoom, tx: d.tx + dx, ty: d.ty + dy }));
    }
  };

  return (
    <div ref={stageRef} className={styles.stage}>
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
        className={[styles.full, zoom ? styles.zoomed : "", panning ? styles.panning : ""]
          .filter(Boolean)
          .join(" ")}
        style={
          {
            "--ar": `${photo.width} / ${photo.height}`,
            ...(zoom
              ? { transform: transform(zoom), transformOrigin: `${zoom.ox}px ${zoom.oy}px` }
              : {}),
          } as React.CSSProperties
        }
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}

/** Keep the scaled photo inside the stage on each axis: no gap beside it
    when it is larger than the stage, no overflow when it is smaller. */
function clampPan(z: Zoom, stage: DOMRect | null): Zoom {
  const sl = stage?.left ?? 0;
  const st = stage?.top ?? 0;
  const sw = stage?.width ?? window.innerWidth;
  const sh = stage?.height ?? window.innerHeight;
  const axis = (pos: number, origin: number, size: number, start: number, view: number, t: number) => {
    const scaled = size * ZOOM;
    const at0 = pos + origin * (1 - ZOOM) - start; // scaled edge at t = 0, relative to the stage
    const lo = Math.min(0, view - scaled);
    const hi = Math.max(0, view - scaled);
    return Math.min(hi, Math.max(lo, at0 + t)) - at0;
  };
  return {
    ...z,
    tx: axis(z.left, z.ox, z.w, sl, sw, z.tx),
    ty: axis(z.top, z.oy, z.h, st, sh, z.ty),
  };
}
