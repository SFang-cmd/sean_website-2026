import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getAllWork } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now },
    ...getAllWork().map((w) => ({
      url: `${site.url}/work/${w.meta.slug}`,
      lastModified: now,
    })),
    // B side is listed under its canonical host, not as /photo on the root.
    { url: site.photosUrl, lastModified: now },
    { url: `${site.photosUrl}/gallery`, lastModified: now },
  ];
}
