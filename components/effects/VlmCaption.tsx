"use client";

import { useEffect, useRef, useState } from "react";
import { theme } from "@/config/theme";
import { prefersReducedMotion } from "@/lib/a11y";
import { usePlainEnabled } from "@/lib/plainStore";

/**
 * The footer easter egg: a line written as a VLM captioning the page,
 * typed out once when it scrolls into view.
 */
export function VlmCaption({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const started = useRef(false);
  const [shown, setShown] = useState(0);
  const plain = usePlainEnabled();

  useEffect(() => {
    if (plain) {
      setShown(text.length);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        if (prefersReducedMotion()) {
          setShown(text.length);
          return;
        }
        const id = setInterval(() => {
          setShown((n) => {
            if (n + 1 >= text.length) clearInterval(id);
            return n + 1;
          });
        }, theme.timing.captionMsPerChar);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text, plain]);

  return (
    <p ref={ref} aria-label={text} className="font-mono text-xs text-faint">
      <span aria-hidden>
        {text.slice(0, shown)}
        {!plain && <span className="caret">▌</span>}
      </span>
    </p>
  );
}
