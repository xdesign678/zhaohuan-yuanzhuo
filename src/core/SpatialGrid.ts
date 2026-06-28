export class SpatialGrid<T> {
  private readonly cells = new Map<number, T[]>();
  private readonly activeCellKeys: number[] = [];

  public constructor(private readonly cellSize: number) {}

  public clear(): void {
    for (const key of this.activeCellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.length = 0;
      }
    }

    this.activeCellKeys.length = 0;
  }

  public insert(x: number, y: number, item: T): void {
    const key = this.keyForPoint(x, y);
    let cell = this.cells.get(key);

    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }

    if (cell.length === 0) {
      this.activeCellKeys.push(key);
    }

    cell.push(item);
  }

  public queryCircle(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    this.queryCircleInto(x, y, radius, result);
    return result;
  }

  public queryCircleInto(x: number, y: number, radius: number, result: T[]): void {
    result.length = 0;
    const radiusSquared = radius * radius;
    const minCellX = Math.floor((x - radius) / this.cellSize);
    const maxCellX = Math.floor((x + radius) / this.cellSize);
    const minCellY = Math.floor((y - radius) / this.cellSize);
    const maxCellY = Math.floor((y + radius) / this.cellSize);

    for (let cellY = minCellY; cellY <= maxCellY; cellY += 1) {
      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        const cell = this.cells.get(this.keyForCell(cellX, cellY));
        if (!cell) {
          continue;
        }

        for (const item of cell) {
          const candidate = item as T & { readonly x?: number; readonly y?: number };
          const itemX = candidate.x;
          const itemY = candidate.y;

          if (itemX === undefined || itemY === undefined) {
            result.push(item);
            continue;
          }

          const dx = itemX - x;
          const dy = itemY - y;
          if (dx * dx + dy * dy <= radiusSquared) {
            result.push(item);
          }
        }
      }
    }
  }

  private keyForPoint(x: number, y: number): number {
    return this.keyForCell(Math.floor(x / this.cellSize), Math.floor(y / this.cellSize));
  }

  private keyForCell(cellX: number, cellY: number): number {
    return cellX * 4096 + cellY;
  }
}
