export interface Summoner {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  pickupRadius: number;
  kills: number;
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
}

export interface Pet {
  readonly id: number;
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
}

export interface GameStats {
  runtime: number;
  spawned: number;
}

export interface GameState {
  summoner: Summoner;
  enemies: Enemy[];
  pets: Pet[];
  gems: Gem[];
  damageEvents: DamageEvent[];
  stats: GameStats;
}
