"use client";

import { useSyncExternalStore } from "react";
import { theme } from "@/config/theme";

/**
 * Tiny shared store for the colour scheme — the one preference both sides of
 * the site share. The choice is `system` (follow `prefers-color-scheme`),
 * `light`, or `dark`. An explicit choice is written to
 * `<html data-theme="light|dark">`, which app/globals.css honours over the
 * media query; `system` removes the attribute. Persisted to localStorage so a
 * visitor's choice survives reloads, and applied before first paint by the
 * inline script in app/layout.tsx so there's no flash.
 */
export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const KEY = "color-scheme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const DEFAULT_CHOICE: ThemeChoice = theme.flags.colorScheme;

const listeners = new Set<() => void>();
let cached: ThemeChoice | null = null;

function isChoice(v: unknown): v is ThemeChoice {
  return v === "system" || v === "light" || v === "dark";
}

function readChoice(): ThemeChoice {
  if (typeof window === "undefined") return DEFAULT_CHOICE;
  if (cached === null) {
    try {
      const saved = window.localStorage.getItem(KEY);
      cached = isChoice(saved) ? saved : DEFAULT_CHOICE;
    } catch {
      cached = DEFAULT_CHOICE;
    }
  }
  return cached;
}

function applyChoice(choice: ThemeChoice) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function setThemeChoice(choice: ThemeChoice) {
  cached = choice;
  applyChoice(choice);
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* private browsing — in-memory only */
  }
  listeners.forEach((l) => l());
}

/** The current choice outside React (e.g. to compute the next step on click). */
export function getThemeChoice(): ThemeChoice {
  return readChoice();
}

/** The visitor's stored choice. Server snapshot is always `system`. */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribe, readChoice, () => DEFAULT_CHOICE);
}

/* ---- resolved scheme: the choice, with `system` tracking the OS ---------- */

function readResolved(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  const choice = readChoice();
  if (choice !== "system") return choice;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function subscribeResolved(fn: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", fn);
  const unsubscribe = subscribe(fn);
  return () => {
    mq.removeEventListener("change", fn);
    unsubscribe();
  };
}

/**
 * The scheme actually in effect ("light" | "dark"). Server snapshot is
 * "light"; anything rendering this should `suppressHydrationWarning`.
 */
export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(subscribeResolved, readResolved, () => "light");
}
