import type { NextConfig } from "next";

/**
 * photos.sean-fang.com is a host alias for the /photo routes of this same
 * app (one deploy, one codebase). Internally the B side always lives at
 * /photo so in-app navigation (and the A↔B transition) is a plain route
 * change on either host.
 */
const PHOTOS_HOST = "photos.sean-fang.com";

const nextConfig: NextConfig = {
  async rewrites() {
    // `beforeFiles`: a plain rewrite list only runs when no page matches the
    // path, and `/` is a page (the A home), so the root rewrite never fired
    // and photos.sean-fang.com/ served the engineering side.
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: PHOTOS_HOST }],
          destination: "/photo",
        },
        {
          source: "/:path((?!photo|_next|photos|favicon|icon|apple-icon|opengraph-image).*)",
          has: [{ type: "host", value: PHOTOS_HOST }],
          destination: "/photo/:path",
        },
      ],
    };
  },
};

export default nextConfig;
