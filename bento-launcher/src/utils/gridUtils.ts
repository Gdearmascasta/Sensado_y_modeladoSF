import type { GridSize } from '../types';

/**
 * Maps a GridSize to Tailwind CSS col-span and row-span classes.
 * Uses responsive prefixes: 1-col on mobile, 2-col on sm, 4-col bento on lg+.
 *
 * Mobile  (< 640px):  always col-span-1
 * Tablet  (640-1024): colSpan 1→1, colSpan 2→2  (2-col grid)
 * Desktop (≥ 1024px): full bento — colSpan 1→1 or 2, rowSpan 1→1 or 2
 */
export function getGridClasses(gridSize: GridSize): string {
  const col = gridSize.colSpan;
  const row = gridSize.rowSpan;

  // On lg+ a colSpan:2 tile spans 2 of the 4 columns
  const colClass = col === 2
    ? 'col-span-1 sm:col-span-2 lg:col-span-2'
    : 'col-span-1';

  const rowClass = row === 2
    ? 'lg:row-span-2'
    : 'row-span-1';

  return `${colClass} ${rowClass}`;
}
