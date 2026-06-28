import { EntityManager } from '../core/EntityManager';
import { BALANCE } from '../data/Balance';
import type { GameState } from '../entities/GameTypes';

export class XPSystem {
  public update(state: GameState, entities: EntityManager, deltaSeconds: number): void {
    const summoner = state.summoner;
    const pickupRadiusSquared = summoner.pickupRadius * summoner.pickupRadius;

    for (const gem of state.gems) {
      if (!gem.active) {
        continue;
      }

      const dx = summoner.x - gem.x;
      const dy = summoner.y - gem.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= pickupRadiusSquared) {
        summoner.xp += gem.value;
        entities.releaseGem(gem);
        this.applyLevelUps(state);
        continue;
      }

      if (distanceSquared > 0.01 && distanceSquared <= pickupRadiusSquared * 2.25) {
        const distance = Math.sqrt(distanceSquared);
        const step = BALANCE.gem.magnetSpeed * deltaSeconds;
        gem.x += (dx / distance) * Math.min(step, distance);
        gem.y += (dy / distance) * Math.min(step, distance);
      }
    }
  }

  private applyLevelUps(state: GameState): void {
    const summoner = state.summoner;

    while (summoner.xp >= summoner.xpToNext) {
      summoner.xp -= summoner.xpToNext;
      summoner.level += 1;
      summoner.xpToNext += 8;

      for (const pet of state.pets) {
        if (pet.active) {
          pet.level = Math.min(5, pet.level + 1);
        }
      }
    }
  }
}
