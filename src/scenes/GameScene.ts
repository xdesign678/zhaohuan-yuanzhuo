import Phaser from 'phaser';
import { DragMovementController } from '../ui/DragInput';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const PLAYER_SIZE = 42;
const PLAYER_SPEED = 520;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private movement!: DragMovementController;

  public constructor() {
    super('GameScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#09080d');
    this.createBackdrop();

    const startX = GAME_WIDTH / 2;
    const startY = GAME_HEIGHT / 2;
    this.player = this.add
      .rectangle(startX, startY, PLAYER_SIZE, PLAYER_SIZE, 0x78f2c4, 1)
      .setStrokeStyle(2, 0x16101f);

    const halfSize = PLAYER_SIZE / 2;
    this.movement = new DragMovementController({
      minX: halfSize,
      minY: halfSize,
      maxX: GAME_WIDTH - halfSize,
      maxY: GAME_HEIGHT - halfSize
    });

    this.input.addPointer(4);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerEnd, this);
    this.input.on('pointerupoutside', this.handlePointerEnd, this);
    this.input.on('pointercancel', this.handlePointerEnd, this);
  }

  public update(_time: number, delta: number): void {
    const dx = this.movement.targetX - this.player.x;
    const dy = this.movement.targetY - this.player.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= 0.01) {
      return;
    }

    const maxStep = PLAYER_SPEED * (delta / 1000);

    if (distanceSquared <= maxStep * maxStep) {
      this.player.setPosition(this.movement.targetX, this.movement.targetY);
      return;
    }

    const distance = Math.sqrt(distanceSquared);
    this.player.setPosition(this.player.x + (dx / distance) * maxStep, this.player.y + (dy / distance) * maxStep);
  }

  private createBackdrop(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x09080d, 1);

    for (let y = 32; y < GAME_HEIGHT; y += 64) {
      this.add.line(0, 0, 0, y, GAME_WIDTH, y, 0x181420, 0.45).setOrigin(0, 0);
    }

    for (let x = 40; x < GAME_WIDTH; x += 80) {
      this.add.line(0, 0, x, 0, x, GAME_HEIGHT, 0x15111d, 0.35).setOrigin(0, 0);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.preventNativeGesture(pointer);
    this.movement.start(pointer.id, { x: pointer.x, y: pointer.y }, { x: this.player.x, y: this.player.y });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.preventNativeGesture(pointer);
    this.movement.move(pointer.id, { x: pointer.x, y: pointer.y });
  }

  private handlePointerEnd(pointer: Phaser.Input.Pointer): void {
    this.preventNativeGesture(pointer);
    this.movement.end(pointer.id);
  }

  private preventNativeGesture(pointer: Phaser.Input.Pointer): void {
    pointer.event?.preventDefault();
  }
}
