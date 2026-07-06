import { CELL } from "@/lib/grid";

/**
 * The site's fixed backdrop: a faint patch grid the content scrolls over.
 * Deliberately a fixed-position div rather than background-attachment: fixed,
 * which is broken on iOS Safari.
 */
export function PatchGrid() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10"
      style={{
        backgroundImage:
          "linear-gradient(var(--grid-line) 1px, transparent 1px)," +
          "linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
        backgroundSize: `${CELL}px ${CELL}px`,
      }}
    />
  );
}
