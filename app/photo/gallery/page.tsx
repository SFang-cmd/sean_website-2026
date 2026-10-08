import Link from "next/link";
import { series } from "@/content/series";
import { getPhotosBySeries } from "@/lib/photos";

/**
 * B gallery: series index + grid. Phase 0 shell — lists the series and their
 * counts so the data contract is exercised; the real layout
 * (docs/prototypes/b-gallery.html) lands in Phase 2.
 */
export default function Gallery() {
  const bySeries = getPhotosBySeries();
  return (
    <main className="px-7 py-24">
      <h1 className="font-serif text-[40px] leading-none">Gallery</h1>
      <ol className="mt-8 space-y-2">
        {series.map((s) => (
          <li key={s.slug}>
            <span className="text-[15px]">{s.name}</span>
            <span className="ml-2 text-[12px] text-muted tabular-nums">
              {bySeries.get(s.slug)?.length ?? 0}
            </span>
            <p className="max-w-[52ch] text-muted">{s.lede}</p>
          </li>
        ))}
      </ol>
      <p className="mt-12 text-[13px]">
        <Link href="/photo" className="underline underline-offset-4">
          ← Home
        </Link>
      </p>
    </main>
  );
}
