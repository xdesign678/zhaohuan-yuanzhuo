import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/systems/GameSimulation';

describe('GameSimulation XP loop', () => {
  it('collects nearby gems and levels up the summoner', () => {
    const game = GameSimulation.createForTest();
    game.spawnGemForTest(180, 320, 12);

    game.update(0.1);

    expect(game.state.gems.every((gem) => !gem.active)).toBe(true);
    expect(game.state.summoner.level).toBe(2);
    expect(game.state.summoner.xp).toBe(2);
  });
});
