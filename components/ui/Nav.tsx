import Link from "next/link";
import { site } from "@/content/site";
import { theme } from "@/config/theme";
import { PatchHighlight } from "@/components/effects/PatchHighlight";
import { SideLink } from "@/components/effects/SideFlip";

const LINK_CLASS = "patch-link text-[13px] text-muted";
/**
 * The door is set in the other side's typeface (Instrument Serif, italic):
 * the one item in the menu that visibly belongs to B.
 */
const DOOR_CLASS = "patch-link font-serif italic text-[17px] leading-none text-fg";

export function Nav() {
  return (
    <header className="flex items-baseline justify-between pt-12 pb-6">
      <PatchHighlight>
        <Link href="/" className="patch-link text-sm font-medium">
          {site.name}
        </Link>
      </PatchHighlight>
      <nav className="flex items-baseline gap-6">
        {site.nav.map((item) => {
          const isDoor = item.href.startsWith("/photo");
          return (
            <PatchHighlight
              key={item.href}
              rows={isDoor ? theme.door.rows : undefined}
              idle={isDoor ? "flicker" : undefined}
            >
              {isDoor ? (
                // The door to the photography side runs the shrink-wave transition.
                <SideLink href={item.href} className={DOOR_CLASS}>
                  {item.label}
                </SideLink>
              ) : (
                <a href={item.href} className={LINK_CLASS}>
                  {item.label}
                </a>
              )}
            </PatchHighlight>
          );
        })}
      </nav>
    </header>
  );
}
