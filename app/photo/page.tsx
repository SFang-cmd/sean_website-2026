import Link from "next/link";
import { getHomePhotos } from "@/lib/photos";

/**
 * B home: the streams. Phase 0 shell — renders the data it will receive so
 * the route builds; the stream layout (docs/prototypes/b-home.html) lands in
 * Phase 2.
 */
export default function PhotoHome() {
  const photos = getHomePhotos();
  return (
    <main className="px-7 py-24">
      <h1 className="font-serif text-[clamp(40px,7vw,96px)] leading-[0.98] max-w-[14ch]">
        The rest of the time I do the looking myself.
      </h1>
      <p className="mt-6 max-w-[44ch] text-muted">
        Phase 0 shell. {photos.length} photo{photos.length === 1 ? "" : "s"} flagged
        for the home page. The streams land in Phase 2.
      </p>
      <p className="mt-6 text-[13px]">
        <Link href="/photo/gallery" className="underline underline-offset-4">
          Gallery
        </Link>
      </p>
    </main>
  );
}
