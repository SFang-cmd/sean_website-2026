"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Series } from "@/content/series";
import { groupShoots, type GalleryItem, type Photo } from "@/lib/photos";
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
 * Each series shows its shoots (one cover each, with a count; hover peeks at
 * the second frame) and its singles; a cover opens the lightbox over that
 * shoot's photos, a single over the series' singles. Deep links: opening a
 * photo sets `#<id>`; loading with that hash opens it (see useLightbox).
 */
export function Gallery({ sections }: { sections: GallerySection[] }) {
  const view = useGalleryView();
  const photos = useMemo(() => sections.flatMap((s) => s.photos), [sections]);
  const items = useMemo(
    () => new Map(sections.map((s) => [s.slug, groupShoots(s.photos)] as const)),
    [sections],
  );
  // ←/→ step through the opened photo's shoot, or through its series' singles.
  const listFor = useCallback(
    (id: string) => {
      const p = photos.find((x) => x.id === id);
      if (!p) return photos;
      if (p.shoot) return photos.filter((x) => x.shoot === p.shoot);
      return photos.filter((x) => x.series === p.series && !x.shoot);
    },
    [photos],
  );
  const { index, list, open, nav, closed } = useLightbox(photos, listFor);
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
                <span className="ml-2 text-[12px] tabular-nums text-muted">{items.get(s.slug)?.length ?? 0}</span>
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
              {(items.get(s.slug) ?? []).map((item) =>
                item.kind === "shoot" ? (
                  <ShootCard key={`shoot-${item.slug}`} item={item} view={view} open={open} />
                ) : (
                  <Cell key={item.photo.id} photo={item.photo} view={view} open={open} />
                ),
              )}
            </div>
          </section>
        ))}
      </main>

      <Lightbox photos={list} index={index} onNav={nav} onClosed={closed} />
    </div>
  );
}

type OpenFn = (id: string, from?: HTMLElement) => void;

function Cell({ photo: p, view, open }: { photo: Photo; view: GalleryView; open: OpenFn }) {
  return (
    <figure
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
        <i className="font-serif text-[14px] italic text-fg">{p.title}</i> · {p.place} · {p.year}
      </figcaption>
    </figure>
  );
}

/** A shoot: its cover (second frame on hover) and a count; opens into the set. */
function ShootCard({
  item,
  view,
  open,
}: {
  item: Extract<GalleryItem, { kind: "shoot" }>;
  view: GalleryView;
  open: OpenFn;
}) {
  const { cover: p, photos, slug } = item;
  const peek = photos.find((x) => x.id !== p.id);
  return (
    <figure
      id={p.id}
      data-shoot={slug}
      className={`${styles.figure} ${styles.shoot}`}
      style={{ "--ar": `${p.width} / ${p.height}` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={(e) => open(p.id, e.currentTarget)}
        aria-label={`${p.title}, ${photos.length} photos`}
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
        {peek && (
          <Image
            loader={loaderFor(peek)}
            src={srcFor(peek)}
            alt=""
            fill
            sizes={view === "editorial" ? EDITORIAL_SIZES : GRID_SIZES}
            className={styles.peek}
          />
        )}
      </button>
      <figcaption className="mt-1.5 flex items-baseline justify-between gap-3 text-[12px] text-muted">
        <span>
          <i className="font-serif text-[14px] italic text-fg">{p.title}</i> · {p.place} · {p.year}
        </span>
        <span className="shrink-0 tabular-nums">{photos.length} photos</span>
      </figcaption>
    </figure>
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
