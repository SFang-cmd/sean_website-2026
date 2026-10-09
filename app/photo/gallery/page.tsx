import type { Metadata } from "next";
import { series } from "@/content/series";
import { getPhotosBySeries } from "@/lib/photos";
import { site } from "@/content/site";
import { photoCanonicalBase } from "@/lib/host";
import { PhotoNav } from "@/components/photo/PhotoNav";
import { PhotoFooter } from "@/components/photo/PhotoFooter";
import { Gallery } from "@/components/photo/Gallery";

export const metadata: Metadata = {
  title: { absolute: `Gallery — ${site.name}` },
  alternates: { canonical: `${photoCanonicalBase(site.url, site.photosUrl)}/gallery` },
};

/**
 * B gallery: the organized view. Series come from content/series.ts, photos
 * from the manifest grouped by series (newest first within each). Series with
 * no photos are omitted.
 */
export default function GalleryPage() {
  const bySeries = getPhotosBySeries();
  const sections = series
    .map((s) => ({ ...s, photos: bySeries.get(s.slug) ?? [] }))
    .filter((s) => s.photos.length > 0);
  return (
    <>
      <PhotoNav />
      <Gallery sections={sections} />
      <PhotoFooter />
    </>
  );
}
