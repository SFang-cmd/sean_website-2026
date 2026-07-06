"use client";

import { usePlainEnabled } from "@/lib/plainStore";
import { PlainToggle } from "@/components/ui/PlainToggle";
import { TrackerToggle } from "@/components/ui/TrackerToggle";
import { HighlightToggle } from "@/components/ui/HighlightToggle";

/**
 * Footer preference row. Plaintext mode is the master switch; when it's on it
 * overrides the other two, so we hide them to avoid implying they still apply.
 */
export function EffectToggles() {
  const plain = usePlainEnabled();
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      <PlainToggle />
      {!plain && <TrackerToggle />}
      {!plain && <HighlightToggle />}
    </div>
  );
}
