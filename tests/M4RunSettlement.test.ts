import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '../src/storage/SaveManager';
import { GameSimulation } from '../src/systems/GameSimulation';

describe('M4 run settlement', () => {
  it('applies saved growth bonuses when a run starts', () => {
    const save = createDefaultSave();
    save.growth.vitality = 2;
    save.growth.magnet = 1;
    save.growth.bond = 1;
    save.growth.reaction = 1;

    const game = GameSimulation.createForTest({ saveData: save });

    expect(game.state.summoner.maxHp).toBe(120);
    expect(game.state.summoner.pickupRadius).toBe(86);
    expect(game.state.pets[0]?.level).toBe(2);
    expect(game.state.reactionDamageMultiplier).toBeCloseTo(1.1);
  });

  it('ends the run from enemy contact damage and awards soul crystals once', () => {
    const save = createDefaultSave();
    const game = GameSimulation.createForTest({ saveData: save });
    game.state.summoner.hp = 1;
    game.state.summoner.kills = 7;
    game.spawnEnemyForTest(game.state.summoner.x, game.state.summoner.y, 50);

    game.update(0.5);

    expect(game.state.runStatus).toBe('gameOver');
    expect(game.state.summoner.hp).toBe(0);
    const result = game.settleRun(save);
    expect(result.soulCrystals).toBeGreaterThan(0);
    expect(save.soulCrystals).toBe(result.soulCrystals);
    expect(save.runs).toBe(1);
    expect(save.bestKills).toBe(7);
    expect(game.settleRun(save).soulCrystals).toBe(0);
  });
});
