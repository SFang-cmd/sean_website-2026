"use client";

import { setHighlightingEnabled, useHighlightingEnabled } from "@/lib/highlightStore";

export function HighlightToggle() {
  const enabled = useHighlightingEnabled();
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => setHighlightingEnabled(!enabled)}
      className="patch-link cursor-pointer font-mono text-xs text-faint"
    >
      link highlighting: {enabled ? "on" : "off"}
    </button>
  );
}
