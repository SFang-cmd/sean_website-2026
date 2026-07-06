"use client";

import { setTrackerEnabled, useTrackerEnabled } from "@/lib/trackerStore";

export function TrackerToggle() {
  const enabled = useTrackerEnabled();
  return (
    <button
      type="button"
      aria-pressed={enabled}
      onClick={() => setTrackerEnabled(!enabled)}
      className="patch-link cursor-pointer font-mono text-xs text-faint"
    >
      cursor tracker: {enabled ? "on" : "off"}
    </button>
  );
}
