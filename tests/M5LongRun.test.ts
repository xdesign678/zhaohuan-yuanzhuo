import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/systems/GameSimulation';
import { createPerformanceSettings } from '../src/utils/DeviceDetect';

describe('M5 long-run stability', () => {
  it('keeps an assisted ten-minute run alive and inside the enemy budget', () => {
    const game = GameSimulation.create({
      performanceSettings: createPerformanceSettings({ forcedTier: 'high' })
    });
    game.addAllPetsForTest();

    let maxActiveEnemies = 0;
    for (let step = 0; step < 6000; step += 1) {
      const time = step * 0.1;
      game.setSummonerPosition(180 + Math.cos(time * 0.9) * 122, 320 + Math.sin(time * 0.7) * 226);
      game.update(0.1);

      if (game.state.summoner.upgradePaused) {
        const defensiveChoice =
          game.state.summoner.hp < game.state.summoner.maxHp * 0.7
            ? game.state.summoner.upgradeChoices.find((item) => item.type === 'summoner-stat')
            : undefined;
        const choice =
          defensiveChoice ??
          game.state.summoner.upgradeChoices.find((item) => item.type === 'pet-level') ??
          game.state.summoner.upgradeChoices.find((item) => item.type === 'synergy') ??
          game.state.summoner.upgradeChoices[0];
        if (choice) {
          game.chooseUpgrade(choice.id);
        }
      }

      maxActiveEnemies = Math.max(maxActiveEnemies, game.countActiveEnemies());
      if (game.state.runStatus === 'gameOver') {
        break;
      }
    }

    expect(game.state.runStatus).toBe('playing');
    expect(game.state.stats.runtime).toBeGreaterThanOrEqual(600);
    expect(maxActiveEnemies).toBeLessThanOrEqual(game.state.performance.enemySoftCap);
    expect(game.state.enemies.length).toBeLessThanOrEqual(game.state.performance.enemySoftCap + 8);
  });
});
