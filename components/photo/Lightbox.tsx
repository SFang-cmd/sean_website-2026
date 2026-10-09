"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import { usePlainEnabled } from "@/lib/plainStore";
import { useReducedMotion } from "@/lib/motion";
import { loaderFor, srcFor } from "./photoLoader";
import styles from "./Lightbox.module.css";

/**
 * Native <dialog> lightbox. `showModal()` gives us the top layer, Esc, a
 * focus trap and an inert page for free; we add ←/→, prev/next buttons,
 * backdrop-click close and a body scroll lock.
 *
 * Two variants. `paper` (the gallery): page colors, the caption under the
 * photo, text controls. `black` (the home): an opaque #000 backdrop, the
 * photo alone at the largest size that fits, small white controls, and a
 * click-to-zoom (fit ↔ 2× about the clicked point, drag to pan).
 *
 * One close path: every way out (Esc, backdrop, the close button, the
 * parent dropping the index) ends in the native `close` event, and only that
 * event calls `onClosed`, so the parent's cleanup (hash, focus return)
 * runs exactly once whichever way the dialog went.
 *
 * Open/close is a 180 ms fade unless plaintext mode or reduced motion is on.
 * The previous and next photos are fetched while one is open.
 */
export function Lightbox({
  photos,
  index,
  onNav,
  onClosed,
  variant = "paper",
}: {
  photos: Photo[];
  /** Index into `photos` of the open photo; −1 when closed. */
  index: number;
  onNav: (delta: number) => void;
  /** Fired after the dialog has actually closed, whatever closed it. */
  onClosed: () => void;
  variant?: "paper" | "black";
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

  const black = variant === "black";
  const className = [styles.dialog, black ? styles.black : "", fade ? styles.fade : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={black ? undefined : "lightbox-caption"}
      aria-label={black ? (shown?.alt ?? "Photo") : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      {shown && (black ? (
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
          <ZoomableImage key={shown.id} photo={shown} />
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
          <span className={`${styles.counter} tabular-nums`} aria-live="polite">
            {Math.max(index, 0) + 1} / {count}
          </span>
        </>
      ) : (
        <>
          <figure className="m-0 flex max-h-full max-w-full flex-col items-center">
            <Image
              key={shown.id}
              loader={loaderFor(shown)}
              src={srcFor(shown)}
              alt={shown.alt}
              width={shown.width}
              height={shown.height}
              sizes="100vw"
              placeholder="blur"
              blurDataURL={shown.blur}
              className={styles.dialogImg}
            />
            <figcaption id="lightbox-caption" className="mt-3 text-center text-[12px] text-muted">
              <i className="font-serif text-[14px] italic text-fg">{shown.title}</i> · {shown.place}{" "}
              · {shown.year}
            </figcaption>
          </figure>
          <div className="mt-5 flex items-baseline gap-6 text-[12px] text-muted">
            <button
              type="button"
              onClick={() => onNav(-1)}
              className="cursor-pointer underline-offset-4 hover:underline"
              aria-label="Previous photo"
            >
              ← prev
            </button>
            <span className="tabular-nums" aria-live="polite">
              {Math.max(index, 0) + 1} / {count}
            </span>
            <button
              type="button"
              onClick={() => onNav(1)}
              className="cursor-pointer underline-offset-4 hover:underline"
              aria-label="Next photo"
            >
              next →
            </button>
            <button
              type="button"
              onClick={close}
              className="cursor-pointer underline-offset-4 hover:underline"
            >
              close
            </button>
          </div>
        </>
      ))}
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
 * The black variant's photo. Click toggles fit ↔ 2× scaled about the clicked
 * point (so that spot stays put); while zoomed, dragging pans, clamped so the
 * photo never leaves the viewport. The drag writes the transform straight to
 * the element and commits to state on release. Pinch gestures are left to
 * the browser (`touch-action: pinch-zoom`).
 */
function ZoomableImage({ photo }: { photo: Photo }) {
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [panning, setPanning] = useState(false);
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);

  const transform = (z: Zoom) => `translate(${z.tx}px, ${z.ty}px) scale(${ZOOM})`;

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
      clampPan({
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
    const z = clampPan({ ...zoom, tx: d.tx + dx, ty: d.ty + dy });
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
      setZoom(clampPan({ ...zoom, tx: d.tx + dx, ty: d.ty + dy }));
    }
  };

  return (
    <div className={styles.stage}>
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

/** Keep the scaled photo inside the viewport on each axis: no gap beside it
    when it is larger than the viewport, no overflow when it is smaller. */
function clampPan(z: Zoom): Zoom {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const axis = (pos: number, origin: number, size: number, view: number, t: number) => {
    const scaled = size * ZOOM;
    const at0 = pos + origin * (1 - ZOOM); // scaled edge at t = 0
    const lo = Math.min(0, view - scaled);
    const hi = Math.max(0, view - scaled);
    return Math.min(hi, Math.max(lo, at0 + t)) - at0;
  };
  return {
    ...z,
    tx: axis(z.left, z.ox, z.w, vw, z.tx),
    ty: axis(z.top, z.oy, z.h, vh, z.ty),
  };
}
