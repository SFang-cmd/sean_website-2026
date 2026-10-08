import type { ImageLoader } from "next/image";
import type { Photo } from "@/lib/photos";

/**
 * next/image loader that serves the pipeline's pre-built renditions from
 * public/photos/ instead of going through the on-demand optimizer: for a
 * requested width, the smallest JPEG rendition at least that wide (or the
 * largest one). AVIF renditions exist too but next/image has no <picture>
 * negotiation, so the JPEG is what ships for now.
 */
const cache = new WeakMap<Photo, ImageLoader>();

export function loaderFor(photo: Photo): ImageLoader {
  let loader = cache.get(photo);
  if (!loader) {
    const sorted = [...photo.renditions].sort((a, b) => a.width - b.width);
    loader = ({ width }) =>
      (sorted.find((r) => r.width >= width) ?? sorted[sorted.length - 1]).jpg;
    cache.set(photo, loader);
  }
  return loader;
}

/**
 * `src` for next/image. The loader ignores it, so this is just an identifier;
 * it must differ from every rendition URL or next/image's dev check decides
 * the loader "does not implement width".
 */
export function srcFor(photo: Photo): string {
  return `/photos/${photo.id}`;
}
