import { SpatialGrid } from '../core/SpatialGrid';
import type { DamageEvent, Enemy, GameState } from '../entities/GameTypes';

export class PetAISystem {
  private readonly candidates: Enemy[] = [];

  public constructor(private readonly enemyGrid: SpatialGrid<Enemy>) {}

  public update(state: GameState, deltaSeconds: number): void {
    const summoner = state.summoner;

    for (const pet of state.pets) {
      if (!pet.active) {
        continue;
      }

      pet.x = summoner.x + 34;
      pet.y = summoner.y - 28;
      pet.cooldownRemaining = Math.max(0, pet.cooldownRemaining - deltaSeconds);
      pet.targetScanTimer -= deltaSeconds;

      const lockedTarget = this.findActiveEnemy(state.enemies, pet.targetId);
      if (!lockedTarget || !this.isInRange(pet.x, pet.y, lockedTarget.x, lockedTarget.y, pet.range)) {
        pet.targetId = null;
      }

      if (pet.targetId === null && pet.targetScanTimer <= 0) {
        pet.targetId = this.findNearestTargetId(pet.x, pet.y, pet.range);
        pet.targetScanTimer = pet.targetScanInterval;
      }

      if (pet.targetId !== null && pet.cooldownRemaining <= 0) {
        state.damageEvents.push({
          enemyId: pet.targetId,
          amount: pet.damage + (pet.level - 1) * 2
        } satisfies DamageEvent);
        pet.cooldownRemaining = pet.attackCooldown;
      }
    }
  }

  private findNearestTargetId(x: number, y: number, range: number): number | null {
    this.enemyGrid.queryCircleInto(x, y, range, this.candidates);
    let nearest: Enemy | null = null;
    let nearestDistanceSquared = Number.POSITIVE_INFINITY;

    for (const enemy of this.candidates) {
      if (!enemy.active) {
        continue;
      }

      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < nearestDistanceSquared) {
        nearest = enemy;
        nearestDistanceSquared = distanceSquared;
      }
    }

    return nearest?.id ?? null;
  }

  private findActiveEnemy(enemies: Enemy[], enemyId: number | null): Enemy | null {
    if (enemyId === null) {
      return null;
    }

    for (const enemy of enemies) {
      if (enemy.active && enemy.id === enemyId) {
        return enemy;
      }
    }

    return null;
  }

  private isInRange(fromX: number, fromY: number, toX: number, toY: number, range: number): boolean {
    const dx = toX - fromX;
    const dy = toY - fromY;
    return dx * dx + dy * dy <= range * range;
  }
}
