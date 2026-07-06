"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CELL, cellsForRect, type PatchCell } from "@/lib/grid";
import { prefersReducedMotion } from "@/lib/a11y";
import { useHighlightingEnabled } from "@/lib/highlightStore";
import { usePlainEnabled } from "@/lib/plainStore";

/**
 * Wraps an inline element (usually a link) and lights up the backdrop grid
 * cells covering it on hover/focus, rippling out from the cursor entry point.
 * Cells are snapped to viewport coords, so they align with PatchGrid exactly.
 */
export function PatchHighlight({
  children,
  pad = 3,
}: {
  children: ReactNode;
  pad?: number;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wantLit = useRef(false);
  const rafId = useRef(0);
  const [cells, setCells] = useState<PatchCell[]>([]);
  const [lit, setLit] = useState(false);
  const [mounted, setMounted] = useState(false);
  const highlightingOn = useHighlightingEnabled();
  const plain = usePlainEnabled();
  const highlightingEnabled = highlightingOn && !plain;

  useEffect(() => {
    setMounted(true);
    return () => {
      clearTimeout(tapTimer.current);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const show = useCallback(
    (origin?: { x: number; y: number }) => {
      const el = anchor.current;
      if (!el) return;
      setCells(cellsForRect(el.getBoundingClientRect(), pad, origin));
      // Freshly mounted cells must paint at opacity 0 first — transitions
      // don't run on elements that mount already-visible, which made the
      // first hover per link fire all cells instantly. Light them a frame
      // later; wantLit guards against a mouse-out racing the flip.
      wantLit.current = true;
      setLit(false);
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        rafId.current = requestAnimationFrame(() => {
          if (wantLit.current) setLit(true);
        });
      });
    },
    [pad],
  );

  const hide = useCallback(() => {
    wantLit.current = false;
    setLit(false);
  }, []);

  // Cells are viewport-positioned; on scroll/resize they'd drift off the
  // element, so release the highlight instead of chasing it.
  useEffect(() => {
    if (!lit) return;
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("resize", hide);
    };
  }, [lit, hide]);

  const still = prefersReducedMotion();

  return (
    <>
      <span
        ref={anchor}
        onMouseEnter={(e) => show({ x: e.clientX, y: e.clientY })}
        onMouseLeave={hide}
        onFocus={() => show()}
        onBlur={hide}
        // Touch has no hover: flash the wave on tap without delaying the
        // click — it plays during (and briefly after) navigation.
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
          show({ x: e.clientX, y: e.clientY });
          clearTimeout(tapTimer.current);
          tapTimer.current = setTimeout(hide, 700);
        }}
      >
        {children}
      </span>
      {highlightingEnabled && mounted &&
        createPortal(
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {cells.map((c, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: c.x,
                  top: c.y,
                  width: CELL,
                  height: CELL,
                  background: `rgba(var(--accent-rgb), ${c.alpha})`,
                  boxShadow: c.edge
                    ? "inset 0 0 0 0.5px rgba(var(--accent-rgb), 0.4)"
                    : undefined,
                  opacity: lit ? 1 : 0,
                  transition: "opacity 280ms ease",
                  transitionDelay: still
                    ? "0ms"
                    : `${lit ? c.delay : c.hideDelay}ms`,
                }}
              />
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
