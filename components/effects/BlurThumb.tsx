"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { prefersReducedMotion } from "@/lib/a11y";

/**
 * Image that sharpens from blur on load like a diffusion sample converging,
 * with a t=N counter ticking down. Doubles as the loading state for
 * case-study thumbnails.
 */
export function BlurThumb({
  src,
  alt,
  width,
  height,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [t, setT] = useState(50);

  useEffect(() => {
    if (!loaded) return;
    if (prefersReducedMotion()) {
      setT(0);
      return;
    }
    const id = setInterval(() => {
      setT((v) => {
        if (v <= 2) clearInterval(id);
        return Math.max(0, v - 2);
      });
    }, 60);
    return () => clearInterval(id);
  }, [loaded]);

  const still = prefersReducedMotion();

  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        style={{
          filter: loaded ? "blur(0px)" : "blur(16px)",
          transform: loaded ? "scale(1)" : "scale(1.06)",
          transition: still
            ? "none"
            : "filter 1.6s ease, transform 1.6s ease",
        }}
      />
      <span
        aria-hidden
        className="absolute bottom-1.5 right-2 font-mono text-[11px] text-faint"
      >
        t={t}
      </span>
    </span>
  );
}
