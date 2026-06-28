export type ElementType = 'fire' | 'ice' | 'lightning';
export type PetElement = ElementType | 'physical' | 'support';
export type PetBehavior = 'melee-mark' | 'fire-aoe' | 'ice-slow' | 'lightning-chain' | 'heal-shield';
export type PetId = 'saberWolf' | 'flameImp' | 'frostButterfly' | 'stormHawk' | 'healingBloom';

export interface PetDefinition {
  readonly id: PetId;
  readonly name: string;
  readonly element: PetElement;
  readonly behavior: PetBehavior;
  readonly color: number;
  readonly damage: number;
  readonly range: number;
  readonly cooldown: number;
  readonly targetScanInterval: number;
}

export const PET_DEFS: readonly PetDefinition[] = [
  {
    id: 'saberWolf',
    name: '剑齿狼',
    element: 'physical',
    behavior: 'melee-mark',
    color: 0xf2d36b,
    damage: 8,
    range: 150,
    cooldown: 0.34,
    targetScanInterval: 0.2
  },
  {
    id: 'flameImp',
    name: '焰魔',
    element: 'fire',
    behavior: 'fire-aoe',
    color: 0xff5a36,
    damage: 7,
    range: 190,
    cooldown: 0.55,
    targetScanInterval: 0.2
  },
  {
    id: 'frostButterfly',
    name: '霜灵蝶',
    element: 'ice',
    behavior: 'ice-slow',
    color: 0x4cc9f0,
    damage: 4,
    range: 165,
    cooldown: 0.65,
    targetScanInterval: 0.2
  },
  {
    id: 'stormHawk',
    name: '雷羽鹰',
    element: 'lightning',
    behavior: 'lightning-chain',
    color: 0xb388ff,
    damage: 6,
    range: 205,
    cooldown: 0.6,
    targetScanInterval: 0.2
  },
  {
    id: 'healingBloom',
    name: '治愈花',
    element: 'support',
    behavior: 'heal-shield',
    color: 0x81e66f,
    damage: 0,
    range: 0,
    cooldown: 1.6,
    targetScanInterval: 0.2
  }
] as const;

export function getPetDefinition(id: PetId): PetDefinition {
  const definition = PET_DEFS.find((pet) => pet.id === id);
  if (!definition) {
    throw new Error(`Unknown pet definition: ${id}`);
  }
  return definition;
}
