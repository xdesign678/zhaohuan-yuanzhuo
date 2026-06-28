import { EntityManager } from '../core/EntityManager';
import { BALANCE, GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import type { GameState } from '../entities/GameTypes';

export class SpawnSystem {
  private spawnTimer = 0;
  private spawnCursor = 0;

  public update(state: GameState, entities: EntityManager, deltaSeconds: number): void {
    this.spawnTimer -= deltaSeconds;
    const activeEnemies = this.countActiveEnemies(state);

    if (this.spawnTimer > 0) {
      return;
    }

    const elapsed = state.stats.runtime;
    const hp = BALANCE.enemy.baseHp + Math.floor(elapsed / 20) * 4;
    const speed = BALANCE.enemy.baseSpeed + Math.min(28, elapsed * 0.08);
    if (activeEnemies >= state.performance.enemySoftCap) {
      this.refreshOffscreenPressure(state, entities, hp, speed);
      this.spawnTimer = Math.max(0.08, BALANCE.enemy.spawnInterval - elapsed * 0.002);
      return;
    }

    this.spawnAroundEdges(state, entities, hp, speed);
    this.spawnTimer = Math.max(0.08, BALANCE.enemy.spawnInterval - elapsed * 0.002);
  }

  public spawnStressPack(state: GameState, entities: EntityManager, count: number): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const radius = 230 + (index % 9) * 7;
      const x = GAME_WIDTH / 2 + Math.cos(angle) * radius;
      const y = GAME_HEIGHT / 2 + Math.sin(angle) * radius;
      entities.createEnemy(x, y, BALANCE.enemy.baseHp, BALANCE.enemy.baseSpeed, BALANCE.enemy.xpValue);
      state.stats.spawned += 1;
    }
  }

  private spawnAroundEdges(state: GameState, entities: EntityManager, hp: number, speed: number): void {
    const side = this.spawnCursor % 4;
    const offset = (this.spawnCursor * 47) % 1000 / 1000;
    this.spawnCursor += 1;

    let x = 0;
    let y = 0;

    if (side === 0) {
      x = offset * GAME_WIDTH;
      y = -16;
    } else if (side === 1) {
      x = GAME_WIDTH + 16;
      y = offset * GAME_HEIGHT;
    } else if (side === 2) {
      x = offset * GAME_WIDTH;
      y = GAME_HEIGHT + 16;
    } else {
      x = -16;
      y = offset * GAME_HEIGHT;
    }

    entities.createEnemy(x, y, hp, speed, BALANCE.enemy.xpValue);
    state.stats.spawned += 1;
  }

  private countActiveEnemies(state: GameState): number {
    let count = 0;
    for (const enemy of state.enemies) {
      if (enemy.active) {
        count += 1;
      }
    }
    return count;
  }

  private refreshOffscreenPressure(state: GameState, entities: EntityManager, hp: number, speed: number): void {
    const padding = state.performance.renderPadding;
    for (const enemy of state.enemies) {
      if (!enemy.active) {
        continue;
      }

      if (enemy.x < -padding || enemy.x > GAME_WIDTH + padding || enemy.y < -padding || enemy.y > GAME_HEIGHT + padding) {
        entities.releaseEnemy(enemy);
        this.spawnAroundEdges(state, entities, hp + 4, speed + 2);
        return;
      }
    }
  }
}
