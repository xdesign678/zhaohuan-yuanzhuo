import { GROWTH_DEFS, type GrowthNodeId } from '../data/GrowthDefs';
import type { SaveData } from '../storage/SaveManager';

export interface GrowthBonuses {
  readonly maxHpBonus: number;
  readonly moveSpeedMultiplier: number;
  readonly xpMultiplier: number;
  readonly pickupRadiusBonus: number;
  readonly startingPetLevelBonus: number;
  readonly reactionDamageMultiplier: number;
  readonly soulCrystalMultiplier: number;
}

export interface GrowthPurchaseResult {
  readonly purchased: boolean;
  readonly cost: number;
}

export function buyGrowthNode(save: SaveData, nodeId: GrowthNodeId): GrowthPurchaseResult {
  const level = save.growth[nodeId] ?? 0;
  const cost = GROWTH_DEFS[nodeId].costs[level];
  if (cost === undefined || save.soulCrystals < cost) {
    return { purchased: false, cost: cost ?? 0 };
  }

  save.soulCrystals -= cost;
  save.growth[nodeId] = level + 1;
  return { purchased: true, cost };
}

export function getGrowthBonuses(save: SaveData): GrowthBonuses {
  return {
    maxHpBonus: (save.growth.vitality ?? 0) * 10,
    moveSpeedMultiplier: 1 + (save.growth.swiftness ?? 0) * 0.04,
    xpMultiplier: 1 + (save.growth.wisdom ?? 0) * 0.08,
    pickupRadiusBonus: (save.growth.magnet ?? 0) * 14,
    startingPetLevelBonus: save.growth.bond ?? 0,
    reactionDamageMultiplier: 1 + (save.growth.reaction ?? 0) * 0.1,
    soulCrystalMultiplier: 1 + (save.growth.soulHarvest ?? 0) * 0.1
  };
}
