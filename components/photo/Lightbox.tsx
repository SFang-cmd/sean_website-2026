"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/photos";
import { loaderFor, srcFor } from "./photoLoader";
import styles from "./Gallery.module.css";

/**
 * Native <dialog> lightbox. `showModal()` gives us the top layer, Esc, a
 * focus trap and an inert page for free; we add ←/→, prev/next buttons,
 * backdrop-click close and a body scroll lock.
 *
 * One close path: every way out (Esc, backdrop, the close button, the
 * parent dropping `photo`) ends in the native `close` event, and only that
 * event calls `onClosed`, so the parent's cleanup (hash, focus return)
 * runs exactly once whichever way the dialog went.
 */
export function Lightbox({
  photo,
  index,
  count,
  onNav,
  onClosed,
}: {
  photo: Photo | null;
  index: number;
  count: number;
  onNav: (delta: number) => void;
  /** Fired after the dialog has actually closed, whatever closed it. */
  onClosed: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = photo !== null;
  const close = () => ref.current?.close();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

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

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="lightbox-caption"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") onNav(1);
        else if (e.key === "ArrowLeft") onNav(-1);
      }}
    >
      {photo && (
        <>
          <figure className="m-0 flex max-h-full max-w-full flex-col items-center">
            <Image
              key={photo.id}
              loader={loaderFor(photo)}
              src={srcFor(photo)}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="100vw"
              placeholder="blur"
              blurDataURL={photo.blur}
              className={styles.dialogImg}
            />
            <figcaption id="lightbox-caption" className="mt-3 text-center text-[12px] text-muted">
              <i className="font-serif text-[14px] italic text-fg">{photo.title}</i> · {photo.place}{" "}
              · {photo.year}
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
              {index + 1} / {count}
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
      )}
    </dialog>
  );
}
