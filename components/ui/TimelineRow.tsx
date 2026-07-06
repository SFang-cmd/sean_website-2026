import Link from "next/link";
import { PatchHighlight } from "@/components/effects/PatchHighlight";

/**
 * One row in the experience or projects timeline: a title (optionally linked),
 * an optional subtitle, an inline blurb, and a mono period on the right.
 * Shared so the two sections can never drift visually.
 */
export function TimelineRow({
  period,
  title,
  subtitle,
  blurb,
  href,
  last = false,
}: {
  period: string;
  title: string;
  subtitle?: string;
  /** Optional inline description. Omit for a bare, unadorned row. */
  blurb?: string;
  /** Internal route (e.g. /work/seangpt). Omit for a plain, unlinked title. */
  href?: string;
  last?: boolean;
}) {
  const titleNode = href ? (
    <PatchHighlight>
      <Link href={href} className="patch-link font-medium">
        {title}
      </Link>
    </PatchHighlight>
  ) : (
    <span className="font-medium">{title}</span>
  );

  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-3 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <p className="text-[15px]">
        {titleNode}
        {subtitle && <span className="text-[13px] text-muted"> · {subtitle}</span>}
        {blurb && <span className="text-[13px] text-muted"> — {blurb}</span>}
      </p>
      <span className="shrink-0 font-mono text-xs text-faint">{period}</span>
    </div>
  );
}
