import { useSyncExternalStore } from "react";

/**
 * The photography side has two addresses: `/photo/*` on the root host, and
 * `photos.sean-fang.com/*`, a host alias that `next.config.ts` rewrites onto
 * the same `/photo/*` routes. One deploy, one codebase. The alias is the
 * client-facing, canonical address; `/photo` on the root host is the in-app
 * path the A→B door uses, so that transition stays a plain route change.
 *
 * `photos.localhost` is the same alias for local testing (Chromium resolves
 * `*.localhost` to loopback): `http://photos.localhost:3026/gallery`.
 */
export const PHOTOS_HOSTS = ["photos.sean-fang.com", "photos.localhost"] as const;

/** Regex (no anchors; Next adds them) for `has: [{ type: "host" }]` rules. */
export const PHOTOS_HOST_PATTERN = PHOTOS_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|");

export function isPhotosHost(hostname: string): boolean {
  return (PHOTOS_HOSTS as readonly string[]).includes(hostname.toLowerCase());
}

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
 * The absolute URL a cross-host door should load. In production that is the
 * `site.url` link as given; on the local alias (`photos.localhost`) the root
 * host is `localhost` on the same port, so the door stays on the dev server.
 */
export function rootHostHref(href: string): string {
  const { hostname, protocol, port } = window.location;
  if (hostname !== "photos.localhost") return href;
  const u = new URL(href, window.location.href);
  return `${protocol}//localhost${port ? `:${port}` : ""}${u.pathname}${u.search}${u.hash}`;
}

/**
 * Prefix for B-side in-app links: "" on the alias (so the address bar reads
 * `/gallery`, not `/photo/gallery`), "/photo" on the root host.
 */
export function usePhotoBase(): string {
  return usePhotosHost() ? "" : "/photo";
}
