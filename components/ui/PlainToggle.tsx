"use client";

import { setPlainEnabled, usePlainEnabled } from "@/lib/plainStore";

export function PlainToggle() {
  const enabled = usePlainEnabled();
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => setPlainEnabled(!enabled)}
      className="patch-link cursor-pointer font-mono text-xs text-faint"
    >
      plaintext mode: {enabled ? "on" : "off"}
    </button>
  );
}
