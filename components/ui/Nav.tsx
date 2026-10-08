import Link from "next/link";
import { site } from "@/content/site";
import { PatchHighlight } from "@/components/effects/PatchHighlight";
import { SideLink } from "@/components/effects/SideFlip";

const LINK_CLASS = "patch-link text-[13px] text-muted";

export function Nav() {
  return (
    <header className="flex items-baseline justify-between pt-12 pb-6">
      <PatchHighlight>
        <Link href="/" className="patch-link text-sm font-medium">
          {site.name}
        </Link>
      </PatchHighlight>
      <nav className="flex gap-6">
        {site.nav.map((item) => (
          <PatchHighlight key={item.href}>
            {item.href.startsWith("/photo") ? (
              // The door to the photography side runs the shrink-wave transition.
              <SideLink href={item.href} className={LINK_CLASS}>
                {item.label}
              </SideLink>
            ) : (
              <a href={item.href} className={LINK_CLASS}>
                {item.label}
              </a>
            )}
          </PatchHighlight>
        ))}
      </nav>
    </header>
  );
}
