import { SpatialGrid } from '../core/SpatialGrid';
import { HUNT_MARK_DURATION } from '../data/SynergyDefs';
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

      this.placePet(state, pet.id - 1);
      pet.cooldownRemaining = Math.max(0, pet.cooldownRemaining - deltaSeconds);
      pet.targetScanTimer -= deltaSeconds;

      if (pet.definition.behavior === 'heal-shield') {
        if (pet.cooldownRemaining <= 0) {
          summoner.hp = Math.min(summoner.maxHp, summoner.hp + 3 + pet.level);
          summoner.shield = Math.min(40, summoner.shield + 4 + pet.level * 2);
          pet.cooldownRemaining = pet.attackCooldown;
        }
        continue;
      }

      const lockedTarget = this.findActiveEnemy(state.enemies, pet.targetId);
      if (!lockedTarget || !this.isInRange(pet.x, pet.y, lockedTarget.x, lockedTarget.y, pet.range)) {
        pet.targetId = null;
      }

      if (pet.targetId === null && pet.targetScanTimer <= 0) {
        pet.targetId = this.findNearestTargetId(pet.x, pet.y, pet.range);
        pet.targetScanTimer = pet.targetScanInterval;
      }

      if (pet.targetId !== null && pet.cooldownRemaining <= 0) {
        const target = this.findActiveEnemy(state.enemies, pet.targetId);
        if (target) {
          this.attack(state, pet, target);
        }
        pet.cooldownRemaining = pet.attackCooldown;
      }
    }
  }

  private attack(state: GameState, pet: GameState['pets'][number], target: Enemy): void {
    const baseDamage = pet.damage + (pet.level - 1) * 2;
    if (pet.definition.behavior === 'melee-mark') {
      target.huntMarkUntil = state.stats.runtime + HUNT_MARK_DURATION;
      this.pushDamage(state, target, baseDamage, undefined, pet.definition.id, false);
      return;
    }

    if (pet.definition.behavior === 'fire-aoe') {
      this.pushDamage(state, target, baseDamage, 'fire', pet.definition.id, true);
      const radius = pet.level >= 3 ? 54 : 38;
      this.enemyGrid.queryCircleInto(target.x, target.y, radius, this.candidates);
      for (const enemy of this.candidates) {
        if (enemy.active && enemy.id !== target.id) {
          this.pushDamage(state, enemy, Math.max(2, Math.floor(baseDamage * 0.55)), 'fire', pet.definition.id, false);
        }
      }
      return;
    }

    if (pet.definition.behavior === 'ice-slow') {
      target.slowUntil = state.stats.runtime + 2;
      target.slowMultiplier = pet.level >= 3 ? 0.55 : 0.7;
      this.pushDamage(state, target, baseDamage, 'ice', pet.definition.id, true);
      return;
    }

    if (pet.definition.behavior === 'lightning-chain') {
      const chainCount = 2 + (pet.level >= 3 ? 1 : 0) + (pet.level >= 5 ? 1 : 0);
      this.enemyGrid.queryCircleInto(target.x, target.y, pet.range, this.candidates);
      let hits = 0;
      for (const enemy of this.candidates) {
        if (!enemy.active || hits >= chainCount) {
          continue;
        }
        this.pushDamage(state, enemy, Math.max(2, Math.floor(baseDamage * (hits === 0 ? 1 : 0.72))), 'lightning', pet.definition.id, hits === 0);
        hits += 1;
      }
    }
  }

  private pushDamage(state: GameState, enemy: Enemy, amount: number, element: DamageEvent['element'], sourcePetId: string, canTriggerReaction: boolean): void {
    state.damageEvents.push({
      enemyId: enemy.id,
      amount,
      element,
      canTriggerReaction,
      sourcePetId
    });
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

  private placePet(state: GameState, index: number): void {
    const pet = state.pets[index];
    if (!pet) {
      return;
    }

    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(5, state.pets.length));
    const radius = 42;
    pet.x = state.summoner.x + Math.cos(angle) * radius;
    pet.y = state.summoner.y + Math.sin(angle) * radius;
  }
}
