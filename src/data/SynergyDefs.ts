import type { ElementType } from './PetDefs';

export type ReactionType = 'melt' | 'superconduct';

export interface ReactionDefinition {
  readonly type: ReactionType;
  readonly elements: readonly [ElementType, ElementType];
  readonly damage: number;
  readonly radius: number;
}

export const ELEMENT_MARK_DURATION = 2.5;
export const HUNT_MARK_DURATION = 3;
export const REACTION_COOLDOWN = 1.5;
export const REACTION_FRAME_CAP = 8;

export const REACTION_DEFS: readonly ReactionDefinition[] = [
  {
    type: 'melt',
    elements: ['fire', 'ice'],
    damage: 14,
    radius: 34
  },
  {
    type: 'superconduct',
    elements: ['ice', 'lightning'],
    damage: 10,
    radius: 0
  }
] as const;
