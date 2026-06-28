import { describe, expect, it } from 'vitest';
import { BASIC_ENEMY_DEF } from '../src/data/EnemyDefs';
import type { Enemy, GameState } from '../src/entities/GameTypes';
import { ElementSystem } from '../src/systems/ElementSystem';

function createEnemy(id = 1): Enemy {
  return {
    id,
    active: true,
    x: 100,
    y: 100,
    radius: BASIC_ENEMY_DEF.radius,
    hp: BASIC_ENEMY_DEF.hp,
    maxHp: BASIC_ENEMY_DEF.hp,
    speed: BASIC_ENEMY_DEF.speed,
    xpValue: BASIC_ENEMY_DEF.xpValue,
    elementMarks: {},
    huntMarkUntil: 0,
    reactionCooldownUntil: 0,
    slowUntil: 0,
    slowMultiplier: 1,
    defenseBreakUntil: 0,
    damageTakenMultiplier: 1,
    contactCooldownRemaining: 0
  };
}

function createState(enemy = createEnemy()): GameState {
  return {
    summoner: {
      x: 180,
      y: 320,
      radius: 21,
      hp: 100,
      maxHp: 100,
      shield: 0,
      moveSpeedMultiplier: 1,
      xpMultiplier: 1,
      level: 1,
      xp: 0,
      xpToNext: 10,
      pickupRadius: 72,
      kills: 0,
      hitFlashUntil: 0,
      upgradeChoices: [],
      upgradePaused: false
    },
    enemies: [enemy],
    pets: [],
    gems: [],
    damageEvents: [],
    reactionEvents: [],
    stats: {
      runtime: 0,
      spawned: 0,
      reactions: 0
    },
    performance: {
      tier: 'high',
      targetFps: 60,
      minFps: 30,
      enemySoftCap: 220,
      particleLimit: 56,
      renderPadding: 84,
      enableExtraFx: true
    },
    reactionDamageMultiplier: 1,
    soulCrystalMultiplier: 1,
    runStatus: 'playing',
    runSettled: false,
    lastRunResult: null
  };
}

describe('ElementSystem', () => {
  it('expires elemental marks after their duration', () => {
    const enemy = createEnemy();
    const state = createState(enemy);
    const system = new ElementSystem();

    system.applyElement(state, enemy, 'fire', 0, { canTriggerReaction: true });
    system.update(state, 2.6, 2.6);

    expect(enemy.elementMarks.fire).toBeUndefined();
  });

  it('triggers melt when fire and ice coexist and consumes both marks', () => {
    const enemy = createEnemy();
    const state = createState(enemy);
    const system = new ElementSystem();

    system.applyElement(state, enemy, 'fire', 0, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'ice', 0.1, { canTriggerReaction: true });

    expect(state.reactionEvents).toEqual([
      expect.objectContaining({ enemyId: enemy.id, type: 'melt' })
    ]);
    expect(enemy.elementMarks.fire).toBeUndefined();
    expect(enemy.elementMarks.ice).toBeUndefined();
    expect(state.damageEvents.at(-1)?.amount).toBeGreaterThan(0);
  });

  it('blocks repeated reactions on the same enemy during cooldown', () => {
    const enemy = createEnemy();
    const state = createState(enemy);
    const system = new ElementSystem();

    system.applyElement(state, enemy, 'fire', 0, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'ice', 0.1, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'fire', 0.2, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'ice', 0.3, { canTriggerReaction: true });

    expect(state.reactionEvents).toHaveLength(1);
  });

  it('prevents same-frame duplicate reactions', () => {
    const enemy = createEnemy();
    const state = createState(enemy);
    const system = new ElementSystem();

    system.beginFrame();
    system.applyElement(state, enemy, 'fire', 0, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'ice', 0, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'lightning', 0, { canTriggerReaction: true });

    expect(state.reactionEvents).toHaveLength(1);
  });

  it('does not let spread marks trigger a second reaction', () => {
    const enemy = createEnemy();
    const state = createState(enemy);
    const system = new ElementSystem();

    system.applyElement(state, enemy, 'ice', 0, { canTriggerReaction: true });
    system.applyElement(state, enemy, 'fire', 0.1, { canTriggerReaction: false });

    expect(state.reactionEvents).toHaveLength(0);
    expect(enemy.elementMarks.fire).toBeDefined();
    expect(enemy.elementMarks.ice).toBeDefined();
  });
});
