export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface MovementBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export class DragMovementController {
  private activePointerId: number | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private targetStartX = 0;
  private targetStartY = 0;
  private currentTargetX = 0;
  private currentTargetY = 0;

  public constructor(private readonly bounds: MovementBounds) {}

  public get target(): Point {
    return {
      x: this.currentTargetX,
      y: this.currentTargetY
    };
  }

  public get targetX(): number {
    return this.currentTargetX;
  }

  public get targetY(): number {
    return this.currentTargetY;
  }

  public get isDragging(): boolean {
    return this.activePointerId !== null;
  }

  public start(pointerId: number, pointer: Point, playerPosition: Point): void {
    if (this.activePointerId !== null) {
      return;
    }

    this.activePointerId = pointerId;
    this.dragStartX = pointer.x;
    this.dragStartY = pointer.y;
    this.targetStartX = this.clampX(playerPosition.x);
    this.targetStartY = this.clampY(playerPosition.y);
    this.currentTargetX = this.targetStartX;
    this.currentTargetY = this.targetStartY;
  }

  public move(pointerId: number, pointer: Point): void {
    if (this.activePointerId !== pointerId) {
      return;
    }

    this.currentTargetX = this.clampX(this.targetStartX + pointer.x - this.dragStartX);
    this.currentTargetY = this.clampY(this.targetStartY + pointer.y - this.dragStartY);
  }

  public end(pointerId: number): void {
    if (this.activePointerId !== pointerId) {
      return;
    }

    this.activePointerId = null;
    this.targetStartX = this.currentTargetX;
    this.targetStartY = this.currentTargetY;
  }

  private clampX(value: number): number {
    return Math.min(this.bounds.maxX, Math.max(this.bounds.minX, value));
  }

  private clampY(value: number): number {
    return Math.min(this.bounds.maxY, Math.max(this.bounds.minY, value));
  }
}
