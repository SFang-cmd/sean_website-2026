import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getAllWork } from "@/lib/content";
import { photoCanonicalBase } from "@/lib/host";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: site.url, lastModified: now },
    ...getAllWork().map((w) => ({
      url: `${site.url}/work/${w.meta.slug}`,
      lastModified: now,
    })),
    // B side under its canonical address (lib/host.ts decides which host).
    { url: photoCanonicalBase(site.url, site.photosUrl), lastModified: now },
    { url: `${photoCanonicalBase(site.url, site.photosUrl)}/gallery`, lastModified: now },
  ];
}
