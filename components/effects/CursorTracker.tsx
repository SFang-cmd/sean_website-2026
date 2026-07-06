"use client";

import { useEffect, useState } from "react";
import { CELL, snapToGrid } from "@/lib/grid";
import { prefersReducedMotion } from "@/lib/a11y";
import { useTrackerEnabled } from "@/lib/trackerStore";
import { usePlainEnabled } from "@/lib/plainStore";

/**
 * A single faint patch that tracks the cursor across the whole page (the
 * "token under the pointer"). Visitors can turn it off via the footer
 * toggle; the default lives in theme.flags.cursorTracker.
 */
export function CursorTracker() {
  const trackerOn = useTrackerEnabled();
  const plain = usePlainEnabled();
  const enabled = trackerOn && !plain;
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled || prefersReducedMotion()) {
      setPos(null);
      return;
    }
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setPos({ x: snapToGrid(e.clientX), y: snapToGrid(e.clientY) });
      });
    };
    const onLeave = () => setPos(null);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enabled]);

  if (!enabled || !pos) return null;

  return (
    <div
      aria-hidden
      data-tracker
      className="pointer-events-none fixed z-[1]"
      style={{
        left: pos.x,
        top: pos.y,
        width: CELL,
        height: CELL,
        background: "rgba(var(--accent-rgb), 0.08)",
      }}
    />
  );
}
