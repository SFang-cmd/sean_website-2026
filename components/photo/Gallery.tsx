"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Series } from "@/content/series";
import type { Photo } from "@/lib/photos";
import { setGalleryView, useGalleryView, type GalleryView } from "@/lib/galleryViewStore";
import { loaderFor, srcFor } from "./photoLoader";
import { Lightbox } from "./Lightbox";
import { useLightbox } from "./useLightbox";
import styles from "./Gallery.module.css";

export type GallerySection = Series & { photos: Photo[] };

const GRID_SIZES = "(max-width: 599px) calc(100vw - 56px), (max-width: 800px) 50vw, (max-width: 1400px) 30vw, 420px";
const EDITORIAL_SIZES = "(max-width: 815px) calc(100vw - 56px), 760px";

/**
 * B gallery: sticky series index + sections (port of b-gallery.html), with a
 * grid/editorial toggle persisted in localStorage and a <dialog> lightbox.
 * Deep links: opening a photo sets `#<id>`; loading with that hash opens it
 * (see useLightbox).
 */
export function Gallery({ sections }: { sections: GallerySection[] }) {
  const view = useGalleryView();
  const photos = useMemo(() => sections.flatMap((s) => s.photos), [sections]);
  const { index, open, nav, closed } = useLightbox(photos);
  const [active, setActive] = useState<string | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Index active state: the series currently in view.
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    main.querySelectorAll("section[id]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className={styles.wrap}>
      <aside className={styles.aside}>
        <h1 className="mb-8 font-serif text-[40px] leading-none">Gallery</h1>
        <nav aria-label="Series">
          <ol className={styles.index}>
            {sections.map((s) => (
              <li key={s.slug} className="mb-2.5">
                <a
                  href={`#${s.slug}`}
                  aria-current={active === s.slug ? "true" : undefined}
                  className={`text-[15px] underline-offset-4 hover:underline ${
                    active === s.slug ? "underline" : ""
                  }`}
                >
                  {s.name}
                </a>
                <span className="ml-2 text-[12px] tabular-nums text-muted">{s.photos.length}</span>
              </li>
            ))}
          </ol>
        </nav>
        <ViewToggle view={view} />
      </aside>

      <main ref={mainRef} className={`${styles.main} ${view === "editorial" ? styles.editorial : ""}`}>
        {sections.map((s) => (
          <section key={s.slug} id={s.slug} className={styles.section} aria-labelledby={`h-${s.slug}`}>
            <h2 id={`h-${s.slug}`} className="mb-1.5 font-serif text-[32px] leading-none">
              {s.name}
            </h2>
            <p className="mb-7 max-w-[52ch] text-muted">{s.lede}</p>
            <div className={styles.grid}>
              {s.photos.map((p) => (
                <figure
                  key={p.id}
                  id={p.id}
                  className={styles.figure}
                  style={{ "--ar": `${p.width} / ${p.height}` } as React.CSSProperties}
                >
                  <button
                    type="button"
                    onClick={(e) => open(p.id, e.currentTarget)}
                    className={`${styles.cell} ${p.width > p.height ? styles.land : ""} cursor-pointer`}
                  >
                    <Image
                      loader={loaderFor(p)}
                      src={srcFor(p)}
                      alt={p.alt}
                      fill
                      sizes={view === "editorial" ? EDITORIAL_SIZES : GRID_SIZES}
                      placeholder="blur"
                      blurDataURL={p.blur}
                    />
                  </button>
                  <figcaption className="mt-1.5 text-[12px] text-muted">
                    <i className="font-serif text-[14px] italic text-fg">{p.title}</i> · {p.place} ·{" "}
                    {p.year}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </main>

      <Lightbox photos={photos} index={index} onNav={nav} onClosed={closed} />
    </div>
  );
}

function ViewToggle({ view }: { view: GalleryView }) {
  const btn = (v: GalleryView, label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => setGalleryView(v)}
      className={`cursor-pointer underline-offset-4 ${view === v ? "text-fg underline" : "hover:underline"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="mt-12 flex gap-3 text-[12px] text-muted">
      <span>view:</span>
      {btn("grid", "grid")}
      {btn("editorial", "editorial")}
    </div>
  );
}
