import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/systems/GameSimulation';
import { createPerformanceSettings } from '../src/utils/DeviceDetect';

describe('M5 performance settings', () => {
  it('applies low-tier performance budgets to the game simulation', () => {
    const performanceSettings = createPerformanceSettings({ forcedTier: 'low' });

    const game = GameSimulation.createForTest({ performanceSettings });

    expect(game.state.performance.tier).toBe('low');
    expect(game.state.performance.enemySoftCap).toBe(120);
    expect(game.state.performance.targetFps).toBe(24);
  });
});
