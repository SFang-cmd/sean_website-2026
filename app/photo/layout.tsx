import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { site } from "@/content/site";

const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: { absolute: `${site.name} — Photography` },
  description: "Photography by Sean Fang: portraits, sports, travel, aerial.",
  alternates: { canonical: site.photosUrl },
};

/**
 * B side: the photography site. Paper, no grid, no accent color, serif
 * display. The `.b` class scopes the B token set (app/globals.css); the
 * wrapper paints its own background so the A tokens on <body> never show.
 */
export default function PhotoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`b ${serif.variable} min-h-screen bg-bg text-fg`}>
      {children}
    </div>
  );
}
