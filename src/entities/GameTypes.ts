import type { ElementType, PetDefinition } from '../data/PetDefs';
import type { ReactionType } from '../data/SynergyDefs';
import type { UpgradeChoice } from '../data/UpgradeDefs';
import type { PerformanceSettings } from '../utils/DeviceDetect';

export interface Summoner {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  shield: number;
  moveSpeedMultiplier: number;
  xpMultiplier: number;
  level: number;
  xp: number;
  xpToNext: number;
  pickupRadius: number;
  kills: number;
  hitFlashUntil: number;
  damageCooldownUntil: number;
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
  contactCooldownRemaining: number;
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

export interface RunResult {
  readonly kills: number;
  readonly runtime: number;
  readonly reactions: number;
  readonly soulCrystals: number;
  readonly totalSoulCrystals: number;
}

export interface GameState {
  summoner: Summoner;
  enemies: Enemy[];
  pets: Pet[];
  gems: Gem[];
  damageEvents: DamageEvent[];
  reactionEvents: ReactionEvent[];
  stats: GameStats;
  performance: PerformanceSettings;
  reactionDamageMultiplier: number;
  soulCrystalMultiplier: number;
  runStatus: 'playing' | 'gameOver';
  runSettled: boolean;
  lastRunResult: RunResult | null;
}
