"use client";

import { useSyncExternalStore } from "react";
import { isPhotosHost } from "@/lib/host";

/**
 * Client-side view of lib/host.ts (which stays React-free so server
 * components, next.config.ts and the sitemap can import it).
 */
const noop = () => () => {};
const readClient = () => isPhotosHost(window.location.hostname);
const readServer = () => false;

/**
 * True when the page is being viewed through the photos host alias. The
 * server snapshot is `false` (pages are static; the host is unknown at
 * build time), so on the alias the first client render corrects it right
 * after hydration, without a mismatch warning.
 */
export function usePhotosHost(): boolean {
  return useSyncExternalStore(noop, readClient, readServer);
}

/**
 * Prefix for B-side in-app links: "" on the alias (so the address bar reads
 * `/gallery`, not `/photo/gallery`), "/photo" on the root host.
 */
export function usePhotoBase(): string {
  return usePhotosHost() ? "" : "/photo";
}
