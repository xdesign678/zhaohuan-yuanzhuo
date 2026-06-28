import { describe, expect, it } from 'vitest';
import { DragMovementController } from '../src/ui/DragInput';

describe('DragMovementController', () => {
  it('uses drag delta instead of teleporting the player to the finger', () => {
    const controller = new DragMovementController({
      minX: 0,
      minY: 0,
      maxX: 320,
      maxY: 480
    });

    controller.start(1, { x: 250, y: 380 }, { x: 160, y: 240 });
    controller.move(1, { x: 270, y: 350 });

    expect(controller.target).toEqual({ x: 180, y: 210 });
  });

  it('clamps the target inside the world bounds', () => {
    const controller = new DragMovementController({
      minX: 0,
      minY: 0,
      maxX: 320,
      maxY: 480
    });

    controller.start(1, { x: 20, y: 20 }, { x: 10, y: 10 });
    controller.move(1, { x: -80, y: -120 });

    expect(controller.target).toEqual({ x: 0, y: 0 });
  });

  it('ignores other fingers until the active drag ends', () => {
    const controller = new DragMovementController({
      minX: 0,
      minY: 0,
      maxX: 320,
      maxY: 480
    });

    controller.start(1, { x: 100, y: 100 }, { x: 160, y: 240 });
    controller.start(2, { x: 300, y: 400 }, { x: 160, y: 240 });
    controller.move(2, { x: 20, y: 20 });
    controller.move(1, { x: 120, y: 140 });

    expect(controller.target).toEqual({ x: 180, y: 280 });
  });
});
