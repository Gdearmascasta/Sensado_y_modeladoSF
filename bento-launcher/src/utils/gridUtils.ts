import type { GridSize } from '../types';

/**
 * Maps a GridSize to Tailwind CSS col-span and row-span classes.
 *
 * Responsive behavior:
 *   • Mobile  (< 640px):  always col-span-1 (single column)
 *   • Tablet  (640–1024): clamps to 2 cols max
 *   • Desktop (≥ 1024px): full bento — colSpan 1, 2, or 3 of 4 cols
 *
 * colSpan: 3 enables the "hero-block" pattern (3/4 of the row width) which
 * pairs naturally with a 1-col sidebar to fill the remaining quarter.
 */
export function getGridClasses(gridSize: GridSize): string {
  const col = gridSize.colSpan;
  const row = gridSize.rowSpan;

  let colClass: string;
  switch (col) {
    case 3:
      colClass = 'col-span-1 sm:col-span-2 lg:col-span-3';
      break;
    case 2:
      colClass = 'col-span-1 sm:col-span-2 lg:col-span-2';
      break;
    default:
      colClass = 'col-span-1';
  }

  const rowClass = row === 2 ? 'lg:row-span-2' : 'row-span-1';

  return `${colClass} ${rowClass}`;
}
