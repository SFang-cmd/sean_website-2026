import { PatchGrid } from "@/components/effects/PatchGrid";
import { CursorTracker } from "@/components/effects/CursorTracker";

/**
 * A side: the engineering site as seen by a vision model. Fixed patch-grid
 * backdrop, cursor tracker, and the 648px content column. Everything that
 * used to live in the root layout before the photo side existed.
 */
export default function ALayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PatchGrid />
      <CursorTracker />
      <div className="relative z-10 mx-auto max-w-[648px] px-6">{children}</div>
    </>
  );
}
