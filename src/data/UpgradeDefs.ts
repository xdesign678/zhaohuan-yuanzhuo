import type { PetId } from './PetDefs';

export type UpgradeChoiceType = 'new-pet' | 'pet-level' | 'summoner-stat' | 'synergy';

export interface UpgradeChoice {
  readonly id: string;
  readonly type: UpgradeChoiceType;
  readonly petId?: PetId;
  readonly title: string;
  readonly description: string;
}
