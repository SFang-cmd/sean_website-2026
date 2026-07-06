"use client";

import { useSyncExternalStore } from "react";
import { theme } from "@/config/theme";

/**
 * Tiny shared store for the cursor-tracker preference, persisted to
 * localStorage so a visitor's choice survives reloads. Default comes from
 * theme.flags.cursorTracker.
 */
const KEY = "patch-tracker";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  if (typeof window === "undefined") return theme.flags.cursorTracker;
  if (cached === null) {
    try {
      const saved = window.localStorage.getItem(KEY);
      cached = saved === null ? theme.flags.cursorTracker : saved === "1";
    } catch {
      cached = theme.flags.cursorTracker;
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

export function setTrackerEnabled(on: boolean) {
  cached = on;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private browsing — in-memory only */
  }
  listeners.forEach((l) => l());
}

export function useTrackerEnabled(): boolean {
  return useSyncExternalStore(subscribe, read, () => theme.flags.cursorTracker);
}
