import type { GridSize } from '../types';

/**
 * Maps a GridSize to responsive Tailwind col-span / row-span classes.
 *
 * Breakpoint behaviour:
 *   mobile  (< 640px)  → always col-span-1, no row-span (auto height)
 *   sm      (640-1024) → colSpan 2 → sm:col-span-2, no row-span
 *   lg      (≥ 1024px) → full bento: colSpan 2 → lg:col-span-2,
 *                         rowSpan 2 → lg:row-span-2
 *
 * Row-span is only applied at lg+ because below that breakpoint the grid
 * has no fixed row height and row-span would produce uneven results.
 */
export function getGridClasses(gridSize: GridSize): string {
  const col = gridSize.colSpan;
  const row = gridSize.rowSpan;

  const colClass = col === 2
    ? 'col-span-1 sm:col-span-2 lg:col-span-2'
    : 'col-span-1';

  const rowClass = row === 2
    ? 'lg:row-span-2'
    : '';

  return `${colClass} ${rowClass}`.trim();
}
