"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/a11y";
import { rootHostHref } from "@/lib/host";
import { usePhotosHost } from "@/lib/useHost";
import { usePlainEnabled } from "@/lib/plainStore";
import {
  isSideTransitionInFlight,
  runCrossfade,
  runShrinkWave,
  sideOf,
  waitForPathname,
} from "@/lib/sideTransition";

export interface SideLinkProps {
  /** In-app destination on the other side: "/photo" from A, "/" from B. */
  href: string;
  /**
   * Absolute URL to load when the in-app href can't be reached on the current
   * host. Needed on the B door (`href="/"`): on the photos host alias "/" is
   * rewritten onto B, so the door leaves via a full load of this URL instead
   * (lib/host.ts). The wave still runs; it reveals A's background and the
   * new document loads behind it.
   */
  hardHref?: string;
  className?: string;
  children: ReactNode;
}

/**
 * A link between the two sides of the site. On click it runs the shrink
 * wave from the click point (lib/sideTransition.ts) and then completes the
 * Next route change; the arriving route is prefetched on mount and hover.
 *
 * Fallbacks: reduced motion, plaintext mode, or no View Transitions support
 * get a plain crossfade; modifier/middle clicks fall through to the browser
 * (new tab etc.); keyboard activation ripples from the link's centre; a click
 * during an in-flight transition is ignored.
 */
export function SideLink({ href, hardHref, className, children }: SideLinkProps) {
  const router = useRouter();
  const plain = usePlainEnabled();
  // On the photos host alias, "/" (A's home) is rewritten back onto B, so an
  // A-bound link must leave by a full load of `hardHref`. Decided from the
  // hostname: `usePathname()` reports the address-bar path ("/"), not the
  // rewritten route, so it can't tell the alias apart from A.
  const crossHost = usePhotosHost() && sideOf(href) === "a";

  useEffect(() => {
    if (!crossHost) router.prefetch(href);
  }, [router, href, crossHost]);
  const prefetch = () => {
    if (!crossHost) router.prefetch(href);
  };

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let next/link (and the browser) handle anything that isn't a plain
    // primary click: cmd/ctrl-click, shift-click, etc.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    if (isSideTransitionInFlight()) return;

    const arriving = sideOf(href);
    // Enter on a focused link fires a click with detail 0 and no coordinates.
    const rect = e.currentTarget.getBoundingClientRect();
    const origin =
      e.detail === 0
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: e.clientX, y: e.clientY };
    // The wave needs no View Transitions support (it clips a DOM clone), so
    // only motion preferences decide between wave and crossfade.
    const still = plain || prefersReducedMotion();
    if (crossHost) {
      const hard = rootHostHref(hardHref ?? href);
      void (still ? runCrossfade({ arriving, hard }) : runShrinkWave({ origin, arriving, hard }));
      return;
    }
    const navigate = () => {
      router.push(href);
      return waitForPathname(href);
    };
    void (still
      ? runCrossfade({ arriving, navigate })
      : runShrinkWave({ origin, arriving, navigate }));
  };

  return (
    <Link
      href={href}
      className={className}
      // Lets PatchHighlight's touch handler leave navigation to onClick so
      // phones get the wave too.
      data-side-link=""
      onClick={onClick}
      onMouseEnter={prefetch}
      onFocus={prefetch}
    >
      {children}
    </Link>
  );
}
