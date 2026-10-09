import { getHomePhotos } from "@/lib/photos";
import { PhotoNav } from "@/components/photo/PhotoNav";
import { PhotoFooter } from "@/components/photo/PhotoFooter";
import { Streams } from "@/components/photo/Streams";

/**
 * B home: hero → the streams → Work with me → footer door. The page is a
 * server component; only the streams are client-side (layout + motion).
 * Copy below is placeholder until Phase 5 (real content).
 */
const workWithMe = {
  email: "sean@sean-fang.com", // placeholder
  instagram: "seanfang", // placeholder handle
};

export default function PhotoHome() {
  const photos = getHomePhotos();
  return (
    <>
      <PhotoNav blend />
      <main>
        <header className="flex min-h-[92vh] flex-col justify-end px-7 pb-12">
          <h1 className="max-w-[14ch] font-serif text-[clamp(40px,7vw,96px)] leading-[0.98] tracking-[-0.01em]">
            The rest of the time I do the looking myself.
          </h1>
          <p className="mt-6 max-w-[44ch] text-muted">
            Photographer, Philadelphia and New York. Night, street, and from the air. Scroll.
          </p>
        </header>

        <Streams photos={photos} />

        <section
          id="work"
          className="relative z-[4] border-t border-line bg-bg px-7 pb-16 pt-[120px]"
        >
          <h2 className="font-serif text-[clamp(32px,5vw,64px)] leading-none">Work with me</h2>
          <p className="mt-4 max-w-[44ch] text-muted">
            Available for editorial, events, and commissioned work. The fastest way to reach me
            is email:{" "}
            <a href={`mailto:${workWithMe.email}`} className="text-fg underline underline-offset-4">
              {workWithMe.email}
            </a>
            . Instagram:{" "}
            <a
              href={`https://instagram.com/${workWithMe.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline underline-offset-4"
            >
              @{workWithMe.instagram}
            </a>
            .
          </p>
        </section>
      </main>
      <PhotoFooter />
    </>
  );
}
