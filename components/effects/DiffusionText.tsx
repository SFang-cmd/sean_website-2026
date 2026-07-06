"use client";

import { useEffect, useState } from "react";
import { theme } from "@/config/theme";
import { prefersReducedMotion } from "@/lib/a11y";
import { usePlainEnabled } from "@/lib/plainStore";

const GLYPHS = "!<>-_\\/[]{}=+*^?#";

function scramble(text: string, step: number, steps: number): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === " ") {
      out += " ";
      continue;
    }
    const settleAt = steps * (0.25 + 0.7 * (i / text.length));
    out +=
      step > settleAt * Math.random() * 1.4
        ? GLYPHS[(Math.random() * GLYPHS.length) | 0]
        : text[i];
  }
  return out;
}

/**
 * Renders text that resolves from noise glyphs once on mount, like a diffusion
 * sampler converging. Server-renders the final text (SEO/LCP-safe); the
 * scramble only runs client-side.
 */
export function DiffusionText({
  text,
  showCounter = false,
}: {
  text: string;
  showCounter?: boolean;
}) {
  const [display, setDisplay] = useState(text);
  const [t, setT] = useState(0);
  const plain = usePlainEnabled();

  useEffect(() => {
    if (plain || prefersReducedMotion()) return;
    const steps = theme.timing.diffusionSteps;
    let step = steps;
    setT(steps);
    const id = setInterval(() => {
      step -= 1;
      if (step <= 0) {
        setDisplay(text);
        setT(0);
        clearInterval(id);
        return;
      }
      setDisplay(scramble(text, step, steps));
      setT(step);
    }, theme.timing.diffusionMsPerStep);
    return () => clearInterval(id);
  }, [text, plain]);

  return (
    <span aria-label={text}>
      <span aria-hidden>{display}</span>
      {showCounter && !plain && (
        <span
          aria-hidden
          className="ml-3 align-middle font-mono text-xs font-normal text-faint"
        >
          t={t}
        </span>
      )}
    </span>
  );
}
