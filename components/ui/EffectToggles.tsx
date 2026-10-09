"use client";

import { usePlainEnabled } from "@/lib/plainStore";
import { PlainToggle } from "@/components/ui/PlainToggle";
import { TrackerToggle } from "@/components/ui/TrackerToggle";
import { HighlightToggle } from "@/components/ui/HighlightToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Footer preference row. Plaintext mode is the master switch; when it's on it
 * overrides the other two effects, so we hide them to avoid implying they
 * still apply. The theme toggle is a preference, not an effect, so it is
 * always shown.
 */
export function EffectToggles() {
  const plain = usePlainEnabled();
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <PlainToggle />
      {!plain && <TrackerToggle />}
      {!plain && <HighlightToggle />}
      <ThemeToggle className="patch-link cursor-pointer font-mono text-xs text-faint" />
    </div>
  );
}
