import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

/**
 * The B side's display face. Loaded at the root (not in app/photo/layout.tsx)
 * because the A side's nav door ("off the clock") is set in it too — the one
 * item on A that belongs to B.
 */
const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s — ${site.name}`,
  },
  description: site.tagline,
};

/**
 * Colour-scheme bootstrap, run before first paint. Mirrors lib/themeStore.ts:
 * a stored "light"/"dark" becomes `<html data-theme>`; anything else (or no
 * storage) leaves the attribute off so CSS follows `prefers-color-scheme`.
 * Inline so the stylesheet never paints the wrong scheme for a frame.
 */
const themeBootstrap = `try{var t=localStorage.getItem("color-scheme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

/**
 * Root layout: fonts + metadata only. Each side of the site owns its own
 * chrome — see app/(a)/layout.tsx (engineering: patch grid, 648px column)
 * and app/photo/layout.tsx (photography: paper, full width, no grid).
 * `suppressHydrationWarning` on <html>: the bootstrap script may add
 * `data-theme` before React hydrates.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
