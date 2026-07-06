import Link from "next/link";
import { site } from "@/content/site";
import { PatchHighlight } from "@/components/effects/PatchHighlight";

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
            <a href={item.href} className="patch-link text-[13px] text-muted">
              {item.label}
            </a>
          </PatchHighlight>
        ))}
      </nav>
    </header>
  );
}
