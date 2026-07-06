import type { MetadataRoute } from "next";
import { site } from "@/content/site";
import { getAllWork } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.url, lastModified: new Date() },
    ...getAllWork().map((w) => ({
      url: `${site.url}/work/${w.meta.slug}`,
      lastModified: new Date(),
    })),
  ];
}
