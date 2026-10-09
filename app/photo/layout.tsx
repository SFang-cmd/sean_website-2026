import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Photography` },
  description: "Sean Fang, photographer. Here for this moment, and the one right after it.",
  alternates: { canonical: site.photosUrl },
};

/**
 * B side: the photography site. Paper, no grid, no accent color, serif
 * display. The `.b` class scopes the B token set (app/globals.css); the
 * wrapper paints its own background so the A tokens on <body> never show.
 * Instrument Serif itself is loaded in the root layout (A's door uses it too).
 */
export default function PhotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* On the photos host alias the door to A is a cross-origin load; warm
          the connection so the wave lands on a page that's already coming. */}
      <link rel="preconnect" href={site.url} />
      <div className="b min-h-screen bg-bg text-fg">{children}</div>
    </>
  );
}
