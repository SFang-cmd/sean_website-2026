import type { Metadata } from "next";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Photography` },
  description: "Photography by Sean Fang: portraits, sports, travel, aerial.",
  alternates: { canonical: site.photosUrl },
};

/**
 * B side: the photography site. Paper, no grid, no accent color, serif
 * display. The `.b` class scopes the B token set (app/globals.css); the
 * wrapper paints its own background so the A tokens on <body> never show.
 * Instrument Serif itself is loaded in the root layout (A's door uses it too).
 */
export default function PhotoLayout({ children }: { children: React.ReactNode }) {
  return <div className="b min-h-screen bg-bg text-fg">{children}</div>;
}
