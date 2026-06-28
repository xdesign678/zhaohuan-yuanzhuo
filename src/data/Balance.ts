export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

export const BALANCE = {
  enemy: {
    radius: 10,
    baseHp: 14,
    baseSpeed: 36,
    xpValue: 12,
    contactDamage: 7,
    contactInterval: 0.45,
    softCap: 200,
    spawnInterval: 0.32
  },
  gem: {
    radius: 5,
    magnetSpeed: 220
  },
  pet: {
    range: 170,
    damage: 8,
    attackCooldown: 0.35,
    targetScanInterval: 0.2
  },
  summoner: {
    radius: 21,
    pickupRadius: 72,
    baseXpToNext: 10
  },
  spatialGrid: {
    cellSize: 112
  }
} as const;
