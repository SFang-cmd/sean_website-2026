import { theme } from "@/config/theme";

export const CELL = theme.cell;

/** Safety cap so a full-width element can't spawn thousands of DOM nodes. */
const MAX_CELLS = 400;

export interface PatchCell {
  x: number;
  y: number;
  alpha: number;
  delay: number;
  hideDelay: number;
  edge: boolean;
}

export function snapToGrid(v: number): number {
  return Math.floor(v / CELL) * CELL;
}

/**
 * Enumerate the grid cells covering `rect` (viewport coords), padded by `pad` px.
 * Reveal delays ripple outward from `origin` (defaults to the rect's left-center,
 * i.e. where a cursor typically enters a link).
 */
export function cellsForRect(
  rect: DOMRect,
  pad = 3,
  origin?: { x: number; y: number },
  /**
   * Force exactly this many rows, centred on the rect's midline, instead of
   * whichever rows the rect happens to touch. Used by the door (3 rows) so a
   * taller typeface can't change the block's height.
   */
  rows?: number,
): PatchCell[] {
  const x0 = Math.floor((rect.left - pad) / CELL);
  const x1 = Math.ceil((rect.right + pad) / CELL);
  let y0 = Math.floor((rect.top - pad) / CELL);
  let y1 = Math.ceil((rect.bottom + pad) / CELL);
  if (rows && rows > 0) {
    const mid = Math.floor((rect.top + rect.height / 2) / CELL);
    y0 = mid - Math.floor(rows / 2);
    y1 = y0 + rows;
  }

  const ox = (origin?.x ?? rect.left) / CELL;
  const oy = (origin?.y ?? rect.top + rect.height / 2) / CELL;

  const raw: { x: number; y: number; dist: number; edge: boolean }[] = [];
  let maxDist = 0;
  for (let gy = y0; gy < y1; gy++) {
    for (let gx = x0; gx < x1; gx++) {
      if (raw.length >= MAX_CELLS) break;
      const dist = Math.hypot(gx + 0.5 - ox, gy + 0.5 - oy);
      maxDist = Math.max(maxDist, dist);
      raw.push({
        x: gx * CELL,
        y: gy * CELL,
        dist,
        edge: gx === x0 || gx === x1 - 1 || gy === y0 || gy === y1 - 1,
      });
    }
  }

  // Stretch the ripple of small groups to a minimum total spread; large
  // groups keep the standard per-cell pace.
  let msPerCell = theme.timing.waveMsPerCell;
  if (maxDist > 0 && maxDist * msPerCell < theme.timing.minWaveMs) {
    msPerCell = theme.timing.minWaveMs / maxDist;
  }

  return raw.map((c) => ({
    x: c.x,
    y: c.y,
    edge: c.edge,
    alpha: 0.09 + Math.random() * 0.07,
    delay: Math.round(c.dist * msPerCell),
    hideDelay: Math.round(Math.random() * 120),
  }));
}
