import type { NextConfig } from "next";
import { PHOTOS_HOST_MODE, PHOTOS_HOST_PATTERN } from "./lib/host";
import { site } from "./content/site";

/**
 * photos.sean-fang.com is a second address for the photography side of this
 * same app. lib/host.ts decides what it does:
 *  - "redirect": every request on it goes to sean-fang.com/photo/* (307 for
 *    now, so the alias can come back without browsers caching the hop);
 *  - "alias": the host serves /photo/* in place via a host rewrite. Internally
 *    the B side always lives at /photo so in-app navigation (and the A↔B
 *    transition) is a plain route change on either host.
 */
const onPhotosHost = [{ type: "host" as const, value: PHOTOS_HOST_PATTERN }];
// Everything except /photo itself (so a relative destination can never loop)
// and the static/asset routes.
const NOT_PHOTO_OR_ASSET = "/:path((?!photo(?:/|$)|_next|photos|favicon|icon|apple-icon|opengraph-image).*)";

const nextConfig: NextConfig = {
  async redirects() {
    if (PHOTOS_HOST_MODE !== "redirect") return [];
    return [
      { source: "/", has: onPhotosHost, destination: `${site.url}/photo`, permanent: false },
      { source: NOT_PHOTO_OR_ASSET, has: onPhotosHost, destination: `${site.url}/photo/:path`, permanent: false },
      // /photo/* typed on the subdomain: same page on the root host (absolute destination, so no loop).
      { source: "/photo/:path*", has: onPhotosHost, destination: `${site.url}/photo/:path*`, permanent: false },
    ];
  },
  async rewrites() {
    if (PHOTOS_HOST_MODE !== "alias") return [];
    // `beforeFiles`: a plain rewrite list only runs when no page matches the
    // path, and `/` is a page (the A home), so the root rewrite never fired
    // and photos.sean-fang.com/ served the engineering side.
    return {
      beforeFiles: [
        { source: "/", has: onPhotosHost, destination: "/photo" },
        { source: NOT_PHOTO_OR_ASSET, has: onPhotosHost, destination: "/photo/:path" },
      ],
    };
  },
};

export default nextConfig;
