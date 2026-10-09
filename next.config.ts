import type { NextConfig } from "next";
import { PHOTOS_HOST_PATTERN } from "./lib/host";

/**
 * photos.sean-fang.com is a host alias for the /photo routes of this same
 * app (one deploy, one codebase). Internally the B side always lives at
 * /photo so in-app navigation (and the A↔B transition) is a plain route
 * change on either host. The hosts that count as the alias (production and
 * the local `photos.localhost` stand-in) live in lib/host.ts.
 */
const nextConfig: NextConfig = {
  async rewrites() {
    // `beforeFiles`: a plain rewrite list only runs when no page matches the
    // path, and `/` is a page (the A home), so the root rewrite never fired
    // and photos.sean-fang.com/ served the engineering side.
    const onPhotosHost = [{ type: "host" as const, value: PHOTOS_HOST_PATTERN }];
    return {
      beforeFiles: [
        { source: "/", has: onPhotosHost, destination: "/photo" },
        {
          source: "/:path((?!photo|_next|photos|favicon|icon|apple-icon|opengraph-image).*)",
          has: onPhotosHost,
          destination: "/photo/:path",
        },
      ],
    };
  },
};

export default nextConfig;
