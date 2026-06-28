import { describe, expect, it } from 'vitest';
import { SpatialGrid } from '../src/core/SpatialGrid';

interface TestBody {
  readonly id: number;
  readonly x: number;
  readonly y: number;
}

describe('SpatialGrid', () => {
  it('returns only bodies inside a circular query', () => {
    const grid = new SpatialGrid<TestBody>(100);
    const close = { id: 1, x: 45, y: 50 };
    const diagonal = { id: 2, x: 90, y: 90 };
    const far = { id: 3, x: 220, y: 50 };

    grid.insert(close.x, close.y, close);
    grid.insert(diagonal.x, diagonal.y, diagonal);
    grid.insert(far.x, far.y, far);

    expect(grid.queryCircle(50, 50, 50).map((body) => body.id)).toEqual([1]);
  });

  it('clears all indexed bodies before rebuilding the frame', () => {
    const grid = new SpatialGrid<TestBody>(100);
    grid.insert(10, 10, { id: 1, x: 10, y: 10 });

    grid.clear();

    expect(grid.queryCircle(10, 10, 30)).toEqual([]);
  });
});
