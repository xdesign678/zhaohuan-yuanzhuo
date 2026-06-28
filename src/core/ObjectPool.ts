export class ObjectPool<T> {
  private readonly freeItems: T[] = [];

  public constructor(
    private readonly createItem: () => T,
    private readonly activateItem: (item: T) => void,
    private readonly resetItem: (item: T) => void
  ) {}

  public acquire(): T {
    const item = this.freeItems.pop() ?? this.createItem();
    this.activateItem(item);
    return item;
  }

  public release(item: T): void {
    this.resetItem(item);
    this.freeItems.push(item);
  }

  public get availableCount(): number {
    return this.freeItems.length;
  }
}
