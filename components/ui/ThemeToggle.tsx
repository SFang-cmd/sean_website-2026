"use client";

import {
  getThemeChoice,
  setThemeChoice,
  useResolvedTheme,
  useThemeChoice,
  type ThemeChoice,
} from "@/lib/themeStore";

const NEXT: Record<ThemeChoice, ThemeChoice> = {
  system: "light",
  light: "dark",
  dark: "system",
};

/**
 * Three-state colour-scheme toggle shared by both sides: system → light →
 * dark → system. The label always shows what's actually in effect, so
 * "system" also says which way it resolved. Not an effect, so plaintext
 * mode never hides it. `className` carries each side's voice (A: patch-link
 * mono faint; B: small mono muted) — the behaviour is identical.
 *
 * The text depends on localStorage + `matchMedia`, which the server can't
 * know, hence `suppressHydrationWarning`.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const choice = useThemeChoice();
  const resolved = useResolvedTheme();
  const next = NEXT[choice];
  const label = choice === "system" ? `system (${resolved})` : choice;
  return (
    <button
      type="button"
      onClick={() => setThemeChoice(NEXT[getThemeChoice()])}
      aria-label={`Theme: ${choice}, currently ${resolved}. Click to switch to ${next}`}
      className={className}
      suppressHydrationWarning
    >
      {`theme: ${label}`}
    </button>
  );
}
