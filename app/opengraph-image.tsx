import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { site } from "@/content/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "fonts");
const geistMedium = readFileSync(join(fontDir, "Geist-Medium.ttf"));
const geistRegular = readFileSync(join(fontDir, "Geist-Regular.ttf"));
const geistMono = readFileSync(join(fontDir, "GeistMono-Regular.ttf"));

// Light-palette tokens (the OG is a single baked image; it can't adapt to the
// viewer's system theme the way the favicon does, so it uses the paper look).
const bg = "#fcfcfa";
const fg = "#191918";
const muted = "#6b6b68";
const faint = "#a3a39e";
const accent = "#185fa5";
const gridLine = "rgba(128, 128, 128, 0.11)";

export default async function OpengraphImage() {
  const domain = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: bg,
          fontFamily: "Geist",
        }}
      >
        {/* Patch-grid backdrop — the site's ViT sensor grid, 2-cell pitch. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `linear-gradient(${gridLine} 1px, transparent 1px), linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            padding: "96px",
            position: "relative",
          }}
        >
          {/* S-patch mark: accent rhombus + paper initial. */}
          <div
            style={{
              width: 88,
              height: 88,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              marginBottom: 34,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 13,
                left: 13,
                width: 62,
                height: 62,
                backgroundColor: accent,
                transform: "rotate(45deg)",
                borderRadius: 6,
              }}
            />
            <div
              style={{
                display: "flex",
                color: bg,
                fontSize: 46,
                fontWeight: 500,
                position: "relative",
              }}
            >
              S
            </div>
          </div>

          <div
            style={{
              fontSize: 76,
              fontWeight: 500,
              color: fg,
              letterSpacing: -2,
              lineHeight: 1,
              marginBottom: 22,
            }}
          >
            {site.name}
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: muted,
              lineHeight: 1.4,
              maxWidth: 800,
            }}
          >
            {site.tagline}
          </div>

          <div
            style={{
              marginTop: 44,
              fontFamily: "Geist Mono",
              fontSize: 22,
              color: faint,
            }}
          >
            {domain}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: geistMedium, weight: 500, style: "normal" },
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
        { name: "Geist Mono", data: geistMono, weight: 400, style: "normal" },
      ],
    },
  );
}
