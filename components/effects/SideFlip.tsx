"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type MouseEvent, type ReactNode } from "react";
import { prefersReducedMotion } from "@/lib/a11y";
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
   * host. Needed on the B door (`href="/"`): on photos.sean-fang.com "/" is
   * rewritten onto B, so the door leaves via a full load of this URL instead.
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
  const pathname = usePathname();
  const plain = usePlainEnabled();

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);
  const prefetch = () => router.prefetch(href);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let next/link (and the browser) handle anything that isn't a plain
    // primary click: cmd/ctrl-click, shift-click, etc.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    if (isSideTransitionInFlight()) return;

    const arriving = sideOf(href);
    // On photos.sean-fang.com the app sits behind a host rewrite: Next sees
    // /photo while the address bar shows /. A client push to "/" would be
    // rewritten straight back onto B, so the door out is a full page load.
    const rewrittenHost =
      sideOf(pathname) === "b" && !window.location.pathname.startsWith("/photo");
    if (rewrittenHost && arriving === "a") {
      void runCrossfade({ arriving, hard: hardHref ?? href });
      return;
    }

    // Enter on a focused link fires a click with detail 0 and no coordinates.
    const rect = e.currentTarget.getBoundingClientRect();
    const origin =
      e.detail === 0
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: e.clientX, y: e.clientY };
    const navigate = () => {
      router.push(href);
      return waitForPathname(href);
    };
    // The wave needs no View Transitions support (it clips a DOM clone), so
    // only motion preferences decide between wave and crossfade.
    const still = plain || prefersReducedMotion();
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
