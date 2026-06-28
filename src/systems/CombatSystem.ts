import { EntityManager } from '../core/EntityManager';
import type { GameState } from '../entities/GameTypes';

export class CombatSystem {
  private tickAccumulator = 0;

  public update(state: GameState, entities: EntityManager, deltaSeconds: number): void {
    this.tickAccumulator += deltaSeconds;
    if (this.tickAccumulator < 0.1) {
      return;
    }

    this.tickAccumulator -= 0.1;

    for (const damage of state.damageEvents) {
      const enemy = this.findActiveEnemy(state, damage.enemyId);
      if (!enemy) {
        continue;
      }

      enemy.hp -= damage.amount;
      if (enemy.hp > 0) {
        continue;
      }

      state.summoner.kills += 1;
      entities.createGem(enemy.x, enemy.y, enemy.xpValue);
      entities.releaseEnemy(enemy);
    }

    state.damageEvents.length = 0;
  }

  private findActiveEnemy(state: GameState, enemyId: number): GameState['enemies'][number] | null {
    for (const enemy of state.enemies) {
      if (enemy.active && enemy.id === enemyId) {
        return enemy;
      }
    }

    return null;
  }
}
