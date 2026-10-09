import { site } from "@/content/site";
import { SideLink } from "@/components/effects/SideFlip";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * B footer: copyright, the shared theme toggle (in B's small mono voice, the
 * same as the nav's "on the clock"), and the small door back to the
 * engineering side. The door runs the A↔B shrink wave (SideFlip). `hardHref`
 * is required so the photos.sean-fang.com host can leave for the root domain.
 */
export function PhotoFooter() {
  return (
    <footer className="relative z-[4] flex items-baseline justify-between border-t border-line bg-bg px-7 py-8 text-[12px] text-muted">
      <span className="flex items-baseline gap-5">
        <span>© {site.name}</span>
        <ThemeToggle className="cursor-pointer whitespace-nowrap font-mono text-[11px] tracking-[0.08em] underline-offset-4 hover:underline" />
      </span>
      <SideLink href="/" hardHref={site.url} className="underline underline-offset-4">
        engineering →
      </SideLink>
    </footer>
  );
}
