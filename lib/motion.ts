"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(fn: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", fn);
  return () => mq.removeEventListener("change", fn);
}

/**
 * Reactive `prefers-reduced-motion`. Server snapshot is `false` (motion), so
 * the SSR markup is the motion branch and a reduced-motion client swaps to its
 * static branch on hydration. See lib/a11y.ts for the one-shot read.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
