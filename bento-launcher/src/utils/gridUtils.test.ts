import { describe, it, expect } from 'vitest';
import { getGridClasses } from './gridUtils';
import type { GridSize } from '../types';

describe('getGridClasses', () => {
  it('returns correct classes for 1×1 tile', () => {
    const size: GridSize = { colSpan: 1, rowSpan: 1 };
    expect(getGridClasses(size)).toBe('col-span-1 row-span-1');
  });

  it('returns correct classes for 2×1 tile', () => {
    const size: GridSize = { colSpan: 2, rowSpan: 1 };
    expect(getGridClasses(size)).toBe('col-span-2 row-span-1');
  });

  it('returns correct classes for 1×2 tile', () => {
    const size: GridSize = { colSpan: 1, rowSpan: 2 };
    expect(getGridClasses(size)).toBe('col-span-1 row-span-2');
  });

  it('returns correct classes for 2×2 tile', () => {
    const size: GridSize = { colSpan: 2, rowSpan: 2 };
    expect(getGridClasses(size)).toBe('col-span-2 row-span-2');
  });
});
