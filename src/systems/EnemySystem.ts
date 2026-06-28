import type { GameState } from '../entities/GameTypes';

export class EnemySystem {
  public update(state: GameState, deltaSeconds: number): void {
    const summoner = state.summoner;

    for (const enemy of state.enemies) {
      if (!enemy.active) {
        continue;
      }

      const dx = summoner.x - enemy.x;
      const dy = summoner.y - enemy.y;
      const distanceSquared = dx * dx + dy * dy;

      if (distanceSquared <= 0.01) {
        continue;
      }

      const distance = Math.sqrt(distanceSquared);
      const step = enemy.speed * deltaSeconds;
      enemy.x += (dx / distance) * step;
      enemy.y += (dy / distance) * step;
    }
  }
}
