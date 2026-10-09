"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Photo } from "@/lib/photos";

/**
 * Lightbox state shared by the gallery and the home streams: which photo is
 * open, `#<id>` in the URL (opening sets it; loading the page with it opens
 * that photo), prev/next through `photos` (wrapping), and focus returned to
 * the element that opened the lightbox once it has closed.
 *
 * The opener is remembered as an element when `open` is given one, else
 * looked up on close as the `<button>` inside `#<id>` — the convention both
 * the gallery figures and the stream shots follow — so deep links and shots
 * mounted after the hash was read still get their focus back.
 */
export function useLightbox(photos: Photo[], listFor?: (id: string) => Photo[]) {
  const [openId, setOpenId] = useState<string | null>(null);
  // What ←/→ step through for the current open: by default `photos`; with
  // `listFor`, whatever it returns for the opened id (a shoot's set, say).
  const [list, setList] = useState<Photo[]>(photos);
  const opener = useRef<HTMLElement | null>(null);
  const lastId = useRef<string | null>(null);

  const index = openId === null ? -1 : list.findIndex((p) => p.id === openId);
  const current = index >= 0 ? list[index] : null;

  const show = useCallback((id: string) => {
    lastId.current = id;
    setOpenId(id);
    window.history.replaceState(null, "", `#${id}`);
  }, []);

  const open = useCallback(
    (id: string, from?: HTMLElement) => {
      opener.current = from ?? null;
      setList(listFor ? listFor(id) : photos);
      show(id);
    },
    [show, listFor, photos],
  );

  // Runs once per close, from the dialog's native `close` event (Esc,
  // backdrop, close button, or the state being dropped): clear the hash and
  // return focus to whatever opened the lightbox.
  const closed = useCallback(() => {
    setOpenId(null);
    if (window.location.hash) {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", pathname + search);
    }
    const el = opener.current ?? (lastId.current ? openerFor(lastId.current) : null);
    opener.current = null;
    el?.focus();
  }, []);

  const nav = useCallback(
    (delta: number) => {
      if (index < 0) return;
      show(list[(index + delta + list.length) % list.length].id);
    },
    [index, list, show],
  );

  // Deep link on load, and the hash changing underneath us (back button).
  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (photos.some((p) => p.id === id)) {
        opener.current = null;
        lastId.current = id;
        setList(listFor ? listFor(id) : photos);
        setOpenId(id);
      }
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [photos, listFor]);

  return { current, index, list, open, nav, closed };
}

function openerFor(id: string): HTMLElement | null {
  return document.getElementById(id)?.querySelector<HTMLElement>("button") ?? null;
}
