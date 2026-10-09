import Link from "next/link";
import { site } from "@/content/site";
import { SideLink } from "@/components/effects/SideFlip";

/**
 * The quiet way back to the engineering side from the top of B. The A nav's
 * door is "off the clock" in B's serif; this is its mirror: A's mono voice,
 * small and muted, last in the menu. Runs the same shrink wave.
 */
const BACK_LABEL = "on the clock";

/**
 * B chrome: name in serif (→ /photo), then Gallery, Work with me, and the
 * low-key door back to A. `blend` is the home variant: fixed over the
 * streams, white text in `mix-blend-mode: difference`, so it reads dark on
 * paper, light on charcoal, and inverted over whatever image is passing
 * under it.
 */
export function PhotoNav({ blend = false }: { blend?: boolean }) {
  const link = "whitespace-nowrap text-[13px] underline-offset-4 hover:underline";
  return (
    <header
      className={
        blend
          ? "fixed inset-x-0 top-0 z-10 flex items-baseline justify-between px-7 py-5 text-white mix-blend-difference"
          : "flex items-baseline justify-between border-b border-line px-7 py-5"
      }
    >
      <Link href="/photo" className="whitespace-nowrap font-serif text-[22px] leading-none">
        {site.name}
      </Link>
      <nav className="flex items-baseline gap-6">
        <Link href="/photo/gallery" className={link}>
          Gallery
        </Link>
        {/* Hidden on phones: it's a section a scroll away, and the row can't fit four items. */}
        <Link href="/photo#work" className={`${link} hidden sm:inline`}>
          Work with me
        </Link>
        <SideLink
          href="/"
          hardHref={site.url}
          className={`whitespace-nowrap font-mono text-[11px] tracking-[0.08em] underline-offset-4 hover:underline ${blend ? "opacity-70" : "text-muted"}`}
        >
          {BACK_LABEL}
        </SideLink>
      </nav>
    </header>
  );
}
