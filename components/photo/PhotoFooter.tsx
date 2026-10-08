import Link from "next/link";
import { site } from "@/content/site";

/**
 * B footer: copyright and the small door back to the engineering side.
 * `data-side-link="a"` marks the door for the A↔B transition (Phase 3),
 * which will swap this plain <Link> for its transition component.
 */
export function PhotoFooter() {
  return (
    <footer className="relative z-[4] flex items-baseline justify-between border-t border-line bg-bg px-7 py-8 text-[12px] text-muted">
      <span>© {site.name}</span>
      <Link href="/" data-side-link="a" className="underline underline-offset-4">
        engineering →
      </Link>
    </footer>
  );
}
