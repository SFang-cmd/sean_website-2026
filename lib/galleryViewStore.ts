"use client";

import { useSyncExternalStore } from "react";

/**
 * Gallery view preference (grid vs editorial), persisted to localStorage so a
 * visitor's choice survives reloads. Same shape as lib/trackerStore.ts.
 */
export type GalleryView = "grid" | "editorial";

const KEY = "gallery-view";
const DEFAULT: GalleryView = "grid";
const listeners = new Set<() => void>();
let cached: GalleryView | null = null;

function read(): GalleryView {
  if (typeof window === "undefined") return DEFAULT;
  if (cached === null) {
    try {
      const saved = window.localStorage.getItem(KEY);
      cached = saved === "editorial" ? "editorial" : DEFAULT;
    } catch {
      cached = DEFAULT;
    }
  }
  return cached;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setGalleryView(view: GalleryView) {
  cached = view;
  try {
    window.localStorage.setItem(KEY, view);
  } catch {
    /* private browsing — in-memory only */
  }
  listeners.forEach((l) => l());
}

export function useGalleryView(): GalleryView {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
