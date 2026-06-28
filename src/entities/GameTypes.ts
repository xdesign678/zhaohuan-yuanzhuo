import type { ElementType, PetDefinition } from '../data/PetDefs';
import type { ReactionType } from '../data/SynergyDefs';
import type { UpgradeChoice } from '../data/UpgradeDefs';

export interface Summoner {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  level: number;
  xp: number;
  xpToNext: number;
  pickupRadius: number;
  kills: number;
  upgradeChoices: UpgradeChoice[];
  upgradePaused: boolean;
}

export interface ElementMark {
  readonly element: ElementType;
  expireAt: number;
}

export interface Enemy {
  readonly id: number;
  active: boolean;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  xpValue: number;
  elementMarks: Partial<Record<ElementType, ElementMark>>;
  huntMarkUntil: number;
  reactionCooldownUntil: number;
  slowUntil: number;
  slowMultiplier: number;
  defenseBreakUntil: number;
  damageTakenMultiplier: number;
}

export interface Pet {
  readonly id: number;
  readonly definition: PetDefinition;
  active: boolean;
  x: number;
  y: number;
  level: number;
  range: number;
  damage: number;
  attackCooldown: number;
  cooldownRemaining: number;
  targetScanTimer: number;
  targetScanInterval: number;
  targetId: number | null;
}

export interface Gem {
  readonly id: number;
  active: boolean;
  x: number;
  y: number;
  radius: number;
  value: number;
}

export interface DamageEvent {
  enemyId: number;
  amount: number;
  element?: ElementType;
  canTriggerReaction: boolean;
  sourcePetId?: string;
}

export interface ReactionEvent {
  readonly enemyId: number;
  readonly type: ReactionType;
  readonly x: number;
  readonly y: number;
  readonly boosted: boolean;
}

export interface GameStats {
  runtime: number;
  spawned: number;
  reactions: number;
}

export interface GameState {
  summoner: Summoner;
  enemies: Enemy[];
  pets: Pet[];
  gems: Gem[];
  damageEvents: DamageEvent[];
  reactionEvents: ReactionEvent[];
  stats: GameStats;
  reactionDamageMultiplier: number;
}
