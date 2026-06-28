import { BALANCE, GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import type { Enemy, Gem } from '../entities/GameTypes';
import { ObjectPool } from './ObjectPool';

export class EntityManager {
  public readonly enemies: Enemy[] = [];
  public readonly gems: Gem[] = [];

  private nextEnemyId = 1;
  private nextGemId = 1;

  private readonly enemyPool = new ObjectPool<Enemy>(
    () => ({
      id: this.nextEnemyId,
      active: false,
      x: 0,
      y: 0,
      radius: BALANCE.enemy.radius,
      hp: BALANCE.enemy.baseHp,
      maxHp: BALANCE.enemy.baseHp,
      speed: BALANCE.enemy.baseSpeed,
      xpValue: BALANCE.enemy.xpValue,
      elementMarks: {},
      huntMarkUntil: 0,
      reactionCooldownUntil: 0,
      slowUntil: 0,
      slowMultiplier: 1,
      defenseBreakUntil: 0,
      damageTakenMultiplier: 1,
      contactCooldownRemaining: 0
    }),
    (enemy) => {
      enemy.active = true;
    },
    (enemy) => {
      enemy.active = false;
    }
  );

  private readonly gemPool = new ObjectPool<Gem>(
    () => ({
      id: this.nextGemId,
      active: false,
      x: 0,
      y: 0,
      radius: BALANCE.gem.radius,
      value: BALANCE.enemy.xpValue
    }),
    (gem) => {
      gem.active = true;
    },
    (gem) => {
      gem.active = false;
    }
  );

  public createEnemy(x: number, y: number, hp: number, speed: number, xpValue: number): Enemy {
    const enemy = this.enemyPool.acquire();
    if (!this.enemies.includes(enemy)) {
      this.enemies.push(enemy);
      this.nextEnemyId += 1;
    }

    enemy.x = this.clampX(x);
    enemy.y = this.clampY(y);
    enemy.radius = BALANCE.enemy.radius;
    enemy.maxHp = hp;
    enemy.hp = hp;
    enemy.speed = speed;
    enemy.xpValue = xpValue;
    enemy.elementMarks = {};
    enemy.huntMarkUntil = 0;
    enemy.reactionCooldownUntil = 0;
    enemy.slowUntil = 0;
    enemy.slowMultiplier = 1;
    enemy.defenseBreakUntil = 0;
    enemy.damageTakenMultiplier = 1;
    enemy.contactCooldownRemaining = 0;
    return enemy;
  }

  public releaseEnemy(enemy: Enemy): void {
    this.enemyPool.release(enemy);
  }

  public createGem(x: number, y: number, value: number): Gem {
    const gem = this.gemPool.acquire();
    if (!this.gems.includes(gem)) {
      this.gems.push(gem);
      this.nextGemId += 1;
    }

    gem.x = this.clampX(x);
    gem.y = this.clampY(y);
    gem.radius = BALANCE.gem.radius;
    gem.value = value;
    return gem;
  }

  public releaseGem(gem: Gem): void {
    this.gemPool.release(gem);
  }

  private clampX(value: number): number {
    return Math.min(GAME_WIDTH, Math.max(0, value));
  }

  private clampY(value: number): number {
    return Math.min(GAME_HEIGHT, Math.max(0, value));
  }
}
