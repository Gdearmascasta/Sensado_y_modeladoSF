import type { GridSize } from '../types';

/**
 * Maps a GridSize to the corresponding Tailwind CSS col-span and row-span classes.
 */
export function getGridClasses(gridSize: GridSize): string {
  return `col-span-${gridSize.colSpan} row-span-${gridSize.rowSpan}`;
}
