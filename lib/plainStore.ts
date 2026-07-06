"use client";

import { useSyncExternalStore } from "react";
import { theme } from "@/config/theme";

/**
 * Tiny shared store for "plaintext mode" — a master switch that turns off
 * every dynamic flourish at once (cursor tracker, link highlights, hero
 * diffusion, footer caret). Persisted to localStorage so a visitor's choice
 * survives reloads. Default comes from theme.flags.plainMode.
 */
const KEY = "plain-mode";
const listeners = new Set<() => void>();
let cached: boolean | null = null;

function read(): boolean {
  if (typeof window === "undefined") return theme.flags.plainMode;
  if (cached === null) {
    try {
      const saved = window.localStorage.getItem(KEY);
      cached = saved === null ? theme.flags.plainMode : saved === "1";
    } catch {
      cached = theme.flags.plainMode;
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

export function setPlainEnabled(on: boolean) {
  cached = on;
  try {
    window.localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* private browsing — in-memory only */
  }
  listeners.forEach((l) => l());
}

export function usePlainEnabled(): boolean {
  return useSyncExternalStore(subscribe, read, () => theme.flags.plainMode);
}
