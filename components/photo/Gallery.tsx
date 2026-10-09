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

// `sizes` per span (see packRows): a portrait is a third of the row, a paired
// landscape two thirds, a half landscape a half, a lone one the whole row;
// below 801px landscapes are full width and portraits half.
const SIZES: Record<Span, string> = {
  2: "(max-width: 599px) calc(100vw - 56px), (max-width: 800px) 50vw, (max-width: 1400px) 30vw, 420px",
  3: "(max-width: 800px) calc(100vw - 56px), (max-width: 1400px) 45vw, 640px",
  4: "(max-width: 800px) calc(100vw - 56px), (max-width: 1400px) 60vw, 860px",
  6: "(max-width: 800px) calc(100vw - 56px), (max-width: 1400px) 90vw, 1300px",
};
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
              {packRows(items.get(s.slug) ?? []).map(([item, span]) =>
                item.kind === "shoot" && item.photos.length > 1 ? (
                  <ShootCard key={`shoot-${item.slug}`} item={item} view={view} open={open} span={span} />
                ) : item.kind === "shoot" ? (
                  <Cell key={item.cover.id} photo={item.cover} view={view} open={open} span={span} />
                ) : (
                  <Cell key={item.photo.id} photo={item.photo} view={view} open={open} span={span} />
                ),
              )}
            </div>
          </section>
        ))}
      </main>

      <Lightbox photos={list} index={index} onNav={nav} onClosed={closed} filmstrip />
    </div>
  );
}

type OpenFn = (id: string, from?: HTMLElement) => void;

/** Columns of the 6-unit grid an item takes: portrait 2, landscape 4 beside
    a portrait, 3 beside another landscape, 6 alone. */
type Span = 2 | 3 | 4 | 6;

const coverOf = (item: GalleryItem) => (item.kind === "shoot" ? item.cover : item.photo);
const isLand = (item: GalleryItem) => coverOf(item).width > coverOf(item).height;

/**
 * Pack a series into full rows (server render, so the whole section is
 * known). Rows are: portrait + landscape (the landscape two thirds, sides
 * alternating), three portraits, two landscapes at half width, or one
 * landscape full width. Landscapes stay near their CSV position; a
 * portrait row is only taken when enough portraits remain to still pair
 * with every later landscape, so nothing is left to sit alone with a hole
 * beside it. The only short row possible is a final one of portraits.
 * Returns the items in visual order with their spans; the CSS just applies
 * the spans.
 */
function packRows(list: GalleryItem[]): [GalleryItem, Span][] {
  const out: [GalleryItem, Span][] = [];
  const rest = [...list];
  const takeFirst = (land: boolean): GalleryItem | undefined => {
    const i = rest.findIndex((it) => isLand(it) === land);
    return i < 0 ? undefined : rest.splice(i, 1)[0];
  };
  let pairs = 0;
  while (rest.length) {
    const x = rest.shift()!;
    const portraitsLeft = rest.filter((it) => !isLand(it)).length + (isLand(x) ? 0 : 1);
    const landsLeft = rest.filter(isLand).length + (isLand(x) ? 1 : 0);
    if (isLand(x)) {
      const p = takeFirst(false);
      if (p) {
        // Alternate which side the landscape sits on.
        if (pairs++ % 2 === 0) out.push([x, 4], [p, 2]);
        else out.push([p, 2], [x, 4]);
      } else {
        const l = takeFirst(true);
        if (l) out.push([x, 3], [l, 3]);
        else out.push([x, 6]);
      }
    } else if (landsLeft > 0 && portraitsLeft - 3 < landsLeft) {
      // Not enough portraits to spare three: pair this one with the next landscape.
      const l = takeFirst(true)!;
      if (pairs++ % 2 === 0) out.push([l, 4], [x, 2]);
      else out.push([x, 2], [l, 4]);
    } else {
      out.push([x, 2]);
      for (let k = 0; k < 2; k++) {
        const p = takeFirst(false);
        if (p) out.push([p, 2]);
      }
    }
  }
  return out;
}

const SPAN_CLASS: Record<Span, string> = { 2: "", 3: styles.l3, 4: styles.l4, 6: styles.l6 };

function spanClass(span: Span): string {
  return span === 2 ? "" : `${styles.land} ${SPAN_CLASS[span]}`;
}

function Cell({
  photo: p,
  view,
  open,
  span,
}: {
  photo: Photo;
  view: GalleryView;
  open: OpenFn;
  span: Span;
}) {
  const land = p.width > p.height;
  const sizes = view === "editorial" ? EDITORIAL_SIZES : SIZES[span];
  return (
    <figure
      id={p.id}
      className={`${styles.figure} ${spanClass(span)}`}
      style={{ "--ar": `${p.width} / ${p.height}` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={(e) => open(p.id, e.currentTarget)}
        className={`${styles.cell} ${land ? styles.land : ""} cursor-pointer`}
      >
        <Image
          loader={loaderFor(p)}
          src={srcFor(p)}
          alt={p.alt}
          fill
          sizes={sizes}
          placeholder="blur"
          blurDataURL={p.blur}
        />
      </button>
      <figcaption className="mt-1.5 text-[12px] text-muted">
        <i className="font-serif text-[14px] italic text-fg">{p.title}</i>
        {p.place ? ` · ${p.place}` : ""} · {p.year}
      </figcaption>
    </figure>
  );
}

/** A shoot: its cover (second frame on hover) and a count; opens into the set. */
function ShootCard({
  item,
  view,
  open,
  span,
}: {
  item: Extract<GalleryItem, { kind: "shoot" }>;
  view: GalleryView;
  open: OpenFn;
  span: Span;
}) {
  const { cover: p, photos, slug } = item;
  const peek = photos.find((x) => x.id !== p.id);
  const land = p.width > p.height;
  const sizes = view === "editorial" ? EDITORIAL_SIZES : SIZES[span];
  return (
    <figure
      id={p.id}
      data-shoot={slug}
      className={`${styles.figure} ${styles.shoot} ${spanClass(span)}`}
      style={{ "--ar": `${p.width} / ${p.height}` } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={(e) => open(p.id, e.currentTarget)}
        aria-label={`${p.title}, ${photos.length} photos`}
        className={`${styles.cell} ${land ? styles.land : ""} cursor-pointer`}
      >
        <Image
          loader={loaderFor(p)}
          src={srcFor(p)}
          alt={p.alt}
          fill
          sizes={sizes}
          placeholder="blur"
          blurDataURL={p.blur}
        />
        {peek && (
          <Image
            loader={loaderFor(peek)}
            src={srcFor(peek)}
            alt=""
            fill
            sizes={sizes}
            className={styles.peek}
          />
        )}
      </button>
      <figcaption className="mt-1.5 flex items-baseline justify-between gap-3 text-[12px] text-muted">
        <span>
          <i className="font-serif text-[14px] italic text-fg">{p.title}</i>
          {p.place ? ` · ${p.place}` : ""} · {p.year}
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
