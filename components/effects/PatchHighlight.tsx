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
import { theme } from "@/config/theme";

const FOUND_KEY = "door-found";

/**
 * Wraps an inline element (usually a link) and lights up the backdrop grid
 * cells covering it on hover/focus, rippling out from the cursor entry point.
 * Cells are snapped to viewport coords, so they align with PatchGrid exactly.
 *
 * `rows` forces the block to exactly N rows centred on the element; `idle`
 * ="flicker" keeps a few of the element's cells faintly flickering while
 * nobody is hovering (the door: the one link the model can't stop looking
 * at). Idle cells follow the element on scroll/resize; the flicker stops for
 * good once the visitor has clicked through (localStorage `door-found`), and
 * is off entirely under plaintext mode, highlighting-off, or reduced motion.
 */
export function PatchHighlight({
  children,
  pad = 3,
  rows,
  idle,
}: {
  children: ReactNode;
  pad?: number;
  rows?: number;
  idle?: "flicker";
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const wantLit = useRef(false);
  const rafId = useRef(0);
  const [cells, setCells] = useState<PatchCell[]>([]);
  const [lit, setLit] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [found, setFound] = useState(false);
  const [idleCells, setIdleCells] = useState<PatchCell[]>([]);
  const [flick, setFlick] = useState<Record<number, number>>({});
  const highlightingOn = useHighlightingEnabled();
  const plain = usePlainEnabled();
  const highlightingEnabled = highlightingOn && !plain;
  const still = prefersReducedMotion();
  const idleOn =
    idle === "flicker" && highlightingEnabled && !still && mounted && !found;

  useEffect(() => {
    setMounted(true);
    try {
      setFound(window.localStorage.getItem(FOUND_KEY) === "1");
    } catch {
      /* private browsing — flicker every visit */
    }
    return () => {
      clearTimeout(tapTimer.current);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const show = useCallback(
    (origin?: { x: number; y: number }) => {
      const el = anchor.current;
      if (!el) return;
      setCells(cellsForRect(el.getBoundingClientRect(), pad, origin, rows));
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
    [pad, rows],
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

  // Idle cells do follow the element (one rect read per scroll/resize frame),
  // and vanish while it is off-screen.
  useEffect(() => {
    if (!idleOn) {
      setIdleCells([]);
      setFlick({});
      return;
    }
    let raf = 0;
    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = anchor.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) {
          setIdleCells([]);
          return;
        }
        setIdleCells(cellsForRect(r, pad, undefined, rows));
      });
    };
    compute();
    document.fonts?.ready.then(compute);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute);
    };
  }, [idleOn, pad, rows]);

  // The flicker itself: every tick, a few random cells light briefly.
  useEffect(() => {
    if (!idleOn || idleCells.length === 0) return;
    const { flickerPerSec, flickerCells, flickerAlpha } = theme.door;
    const offTimers = new Set<ReturnType<typeof setTimeout>>();
    let tickTimer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!wantLit.current) {
        const next: Record<number, number> = {};
        for (let n = 0; n < flickerCells; n++) {
          const i = Math.floor(Math.random() * idleCells.length);
          next[i] = flickerAlpha * (0.6 + Math.random() * 0.8);
        }
        setFlick((f) => ({ ...f, ...next }));
        const keys = Object.keys(next).map(Number);
        const off = setTimeout(() => {
          setFlick((f) => {
            const g = { ...f };
            keys.forEach((k) => delete g[k]);
            return g;
          });
          offTimers.delete(off);
        }, 180 + Math.random() * 260);
        offTimers.add(off);
      }
      tickTimer = setTimeout(tick, (1000 / flickerPerSec) * (0.5 + Math.random()));
    };
    tickTimer = setTimeout(tick, 300);
    return () => {
      clearTimeout(tickTimer);
      offTimers.forEach(clearTimeout);
    };
  }, [idleOn, idleCells]);

  const markFound = () => {
    if (idle !== "flicker" || found) return;
    setFound(true);
    try {
      window.localStorage.setItem(FOUND_KEY, "1");
    } catch {
      /* in-memory only */
    }
  };

  return (
    <>
      <span
        ref={anchor}
        onMouseEnter={(e) => show({ x: e.clientX, y: e.clientY })}
        onMouseLeave={hide}
        onFocus={() => show()}
        onBlur={hide}
        onClickCapture={markFound}
        // Touch has no hover: flash the wave on tap, then redirect after 300ms
        // to ensure users see the full animation.
        onPointerDown={(e) => {
          if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
          const link = e.currentTarget.querySelector('a');
          if (!link) return;
          // A side-door link runs its own transition from the tap's click
          // event; just flash the highlight and let the tap through.
          if (link.hasAttribute("data-side-link")) {
            markFound();
            show({ x: e.clientX, y: e.clientY });
            return;
          }
          e.preventDefault();
          markFound();
          show({ x: e.clientX, y: e.clientY });
          clearTimeout(tapTimer.current);
          tapTimer.current = setTimeout(() => {
            window.location.href = link.href;
          }, 300);
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
            {!lit &&
              idleCells.map((c, i) => (
                <div
                  key={`idle-${i}`}
                  style={{
                    position: "absolute",
                    left: c.x,
                    top: c.y,
                    width: CELL,
                    height: CELL,
                    background: `rgba(var(--accent-rgb), ${flick[i] ?? 0})`,
                    transition: "background-color 260ms ease",
                  }}
                />
              ))}
          </div>,
          document.body,
        )}
    </>
  );
}
