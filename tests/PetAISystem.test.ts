import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/systems/GameSimulation';

describe('GameSimulation pet AI', () => {
  it('keeps a living target locked while it remains in range', () => {
    const game = GameSimulation.createForTest();
    const first = game.spawnEnemyForTest(220, 320, 20);
    const closerLater = game.spawnEnemyForTest(330, 320, 20);

    game.update(0.21);
    const lockedBefore = game.state.pets[0]?.targetId;
    closerLater.x = 181;
    game.update(0.21);

    expect(lockedBefore).toBe(first.id);
    expect(game.state.pets[0]?.targetId).toBe(first.id);
  });

  it('kills an enemy, drops xp, and opens a pet upgrade choice', () => {
    const game = GameSimulation.createForTest();
    game.spawnEnemyForTest(220, 320, 6);

    game.update(0.21);

    expect(game.state.summoner.kills).toBe(1);
    expect(game.state.summoner.level).toBe(2);
    expect(game.state.summoner.upgradeChoices).toHaveLength(3);

    const petLevelChoice = game.state.summoner.upgradeChoices.find((choice) => choice.type === 'pet-level');
    if (!petLevelChoice) {
      throw new Error('Expected pet-level choice');
    }
    game.chooseUpgrade(petLevelChoice.id);

    expect(game.state.pets[0]?.level).toBe(2);
  });

  it('settles damage on a 100ms tick instead of every frame', () => {
    const game = GameSimulation.createForTest();
    game.spawnEnemyForTest(220, 320, 6);

    game.update(0.05);

    expect(game.state.summoner.kills).toBe(0);
  });

  it('runs five pets together and triggers elemental reactions', () => {
    const game = GameSimulation.createForM2Gate();

    game.update(0.21);

    expect(game.state.pets).toHaveLength(5);
    expect(game.state.stats.reactions).toBeGreaterThan(0);
    expect(game.state.pets.map((pet) => pet.definition.behavior)).toEqual([
      'melee-mark',
      'fire-aoe',
      'ice-slow',
      'lightning-chain',
      'heal-shield'
    ]);
  });
});
