import type { PetId } from '../data/PetDefs';

export const AssetKeys = {
  atlas: 'm3-atlas',
  titleSplash: 'title-splash',
  summoner: 'summoner',
  pets: {
    saberWolf: 'pet_saberWolf',
    flameImp: 'pet_flameImp',
    frostButterfly: 'pet_frostButterfly',
    stormHawk: 'pet_stormHawk',
    healingBloom: 'pet_healingBloom'
  } satisfies Record<PetId, string>,
  enemies: ['enemy_skeleton', 'enemy_bat', 'enemy_slime', 'enemy_ghost'] as const,
  elites: ['enemy_eliteKnight', 'enemy_eliteDemon'] as const,
  boss: 'enemy_lichBoss',
  pickups: {
    xpGem: 'pickup_xpGem',
    heart: 'pickup_heart',
    soulCrystal: 'pickup_soulCrystal'
  },
  icons: {
    fire: 'icon_fire',
    ice: 'icon_ice',
    lightning: 'icon_lightning',
    reaction: 'icon_reaction'
  },
  tiles: {
    dark: 'tile_dark',
    cracked: 'tile_cracked',
    rune: 'tile_rune'
  }
} as const;
