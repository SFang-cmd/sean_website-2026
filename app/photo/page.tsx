import { getHomePhotos } from "@/lib/photos";
import { PhotoNav } from "@/components/photo/PhotoNav";
import { PhotoFooter } from "@/components/photo/PhotoFooter";
import { Streams } from "@/components/photo/Streams";

/**
 * B home: hero → the streams → Work with me → footer door. The page is a
 * server component; only the streams are client-side (layout + motion).
 * The hero must stand alone: photos.sean-fang.com is an entry point of its
 * own, so it says who, where and what without leaning on the A side.
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
            Pictures of people, mostly.
          </h1>
          <p className="mt-6 max-w-[44ch] text-muted">
            Sean Fang, Philadelphia. Graduation portraits, headshots, events, and the occasional
            drone flight. Scroll.
          </p>
        </header>

        <Streams photos={photos} />

        <section
          id="work"
          className="relative z-[4] border-t border-line bg-bg px-7 pb-16 pt-[120px]"
        >
          <h2 className="font-serif text-[clamp(32px,5vw,64px)] leading-none">Work with me</h2>
          <p className="mt-4 max-w-[44ch] text-muted">
            Available for portraits, events, and commissioned work. The fastest way to reach me
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
