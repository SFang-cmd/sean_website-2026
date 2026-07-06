import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// iOS ignores transparency and applies its own rounded mask, so the apple-touch
// icon is opaque: the S-patch mark centered on the site's paper background —
// the same rhombus + knockout look the favicon shows, baked light.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const geistMedium = readFileSync(
  join(process.cwd(), "fonts", "Geist-Medium.ttf"),
);

const bg = "#fcfcfa";
const accent = "#185fa5";

export default async function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          backgroundColor: bg,
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 42,
            left: 42,
            width: 96,
            height: 96,
            backgroundColor: accent,
            transform: "rotate(45deg)",
          }}
        />
        <div
          style={{
            display: "flex",
            color: bg,
            fontSize: 64,
            fontWeight: 500,
            position: "relative",
          }}
        >
          S
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: geistMedium, weight: 500, style: "normal" },
      ],
    },
  );
}
