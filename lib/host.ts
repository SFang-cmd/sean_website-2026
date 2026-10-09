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

/**
 * How the photos host behaves. `"redirect"` (current): every request on it
 * is sent to the root host's /photo/* (one address, the A↔B door is always
 * an in-app route change, no cross-origin load). `"alias"`: the host serves
 * /photo/* in place, B links drop the prefix, the door out is a hard load
 * behind the wave (slower, Sean found the load beat noticeable). Flip this
 * one constant to bring the alias back; next.config.ts, the canonical URLs
 * and the sitemap follow it.
 */
export const PHOTOS_HOST_MODE: "redirect" | "alias" = "redirect";

/** Canonical base for the B side: the alias host when it serves pages, else the root host's /photo. */
export function photoCanonicalBase(rootUrl: string, photosUrl: string): string {
  return PHOTOS_HOST_MODE === "alias" ? photosUrl : `${rootUrl}/photo`;
}

/** Regex (no anchors; Next adds them) for `has: [{ type: "host" }]` rules. */
export const PHOTOS_HOST_PATTERN = PHOTOS_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|");

export function isPhotosHost(hostname: string): boolean {
  return (PHOTOS_HOSTS as readonly string[]).includes(hostname.toLowerCase());
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
