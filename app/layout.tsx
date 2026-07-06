import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { site } from "@/content/site";
import { PatchGrid } from "@/components/effects/PatchGrid";
import { CursorTracker } from "@/components/effects/CursorTracker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.name,
    template: `%s — ${site.name}`,
  },
  description: site.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased" suppressHydrationWarning>
        <PatchGrid />
        <CursorTracker />
        <div className="relative z-10 mx-auto max-w-[648px] px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
