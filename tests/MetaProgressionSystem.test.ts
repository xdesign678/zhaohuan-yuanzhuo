import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '../src/storage/SaveManager';
import { buyGrowthNode, getGrowthBonuses } from '../src/systems/MetaProgressionSystem';
import { GROWTH_DEFS } from '../src/data/GrowthDefs';

describe('MetaProgressionSystem', () => {
  it('buys a growth node when the player has enough soul crystals', () => {
    const save = createDefaultSave();
    save.soulCrystals = 100;

    const result = buyGrowthNode(save, 'vitality');

    expect(result.purchased).toBe(true);
    expect(save.growth.vitality).toBe(1);
    expect(save.soulCrystals).toBe(100 - GROWTH_DEFS.vitality.costs[0]);
  });

  it('rejects purchases that exceed crystals or max level', () => {
    const save = createDefaultSave();

    expect(buyGrowthNode(save, 'vitality').purchased).toBe(false);
    save.soulCrystals = 999;
    for (let index = 0; index < GROWTH_DEFS.vitality.costs.length; index += 1) {
      expect(buyGrowthNode(save, 'vitality').purchased).toBe(true);
    }

    expect(buyGrowthNode(save, 'vitality').purchased).toBe(false);
    expect(save.growth.vitality).toBe(GROWTH_DEFS.vitality.costs.length);
  });

  it('turns growth levels into gameplay bonuses', () => {
    const save = createDefaultSave();
    save.growth.vitality = 2;
    save.growth.swiftness = 1;
    save.growth.wisdom = 1;
    save.growth.magnet = 1;
    save.growth.bond = 1;
    save.growth.reaction = 2;
    save.growth.soulHarvest = 1;

    const bonuses = getGrowthBonuses(save);

    expect(bonuses.maxHpBonus).toBe(20);
    expect(bonuses.moveSpeedMultiplier).toBeCloseTo(1.04);
    expect(bonuses.xpMultiplier).toBeCloseTo(1.08);
    expect(bonuses.pickupRadiusBonus).toBe(14);
    expect(bonuses.startingPetLevelBonus).toBe(1);
    expect(bonuses.reactionDamageMultiplier).toBeCloseTo(1.2);
    expect(bonuses.soulCrystalMultiplier).toBeCloseTo(1.1);
  });
});
