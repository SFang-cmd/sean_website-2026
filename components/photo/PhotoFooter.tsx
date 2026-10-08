import { site } from "@/content/site";
import { SideLink } from "@/components/effects/SideFlip";

/**
 * B footer: copyright and the small door back to the engineering side.
 * The door runs the A↔B shrink wave (SideFlip). `hardHref` is required so
 * the photos.sean-fang.com host can leave for the root domain.
 */
export function PhotoFooter() {
  return (
    <footer className="relative z-[4] flex items-baseline justify-between border-t border-line bg-bg px-7 py-8 text-[12px] text-muted">
      <span>© {site.name}</span>
      <SideLink href="/" hardHref={site.url} className="underline underline-offset-4">
        engineering →
      </SideLink>
    </footer>
  );
}
