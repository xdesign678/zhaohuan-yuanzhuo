import { PET_DEFS, getPetDefinition, type PetId } from '../data/PetDefs';
import type { UpgradeChoice } from '../data/UpgradeDefs';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import type { GameState, Pet } from '../entities/GameTypes';

export class UpgradeSystem {
  public createChoices(state: GameState, level: number): UpgradeChoice[] {
    const choices: UpgradeChoice[] = [];
    const ownedPets = state.pets.filter((pet) => pet.active);
    const ownedPetIds = new Set(ownedPets.map((pet) => pet.definition.id));

    const levelablePet = ownedPets.find((pet) => pet.level < 5);
    if (levelablePet) {
      choices.push({
        id: `pet-level-${levelablePet.definition.id}-${level}`,
        type: 'pet-level',
        petId: levelablePet.definition.id,
        title: `${levelablePet.definition.name}升阶`,
        description: `提升到 Lv${Math.min(5, levelablePet.level + 1)}`
      });
    }

    const newPetCandidates = PET_DEFS.filter((pet) => !ownedPetIds.has(pet.id));
    const newPetSlots = level <= 4 ? 2 : 1;
    for (let index = 0; index < newPetCandidates.length && choices.length < 1 + newPetSlots; index += 1) {
      const pet = newPetCandidates[index];
      choices.push({
        id: `new-pet-${pet.id}-${level}`,
        type: 'new-pet',
        petId: pet.id,
        title: `召唤${pet.name}`,
        description: this.describePet(pet.id)
      });
    }

    if (choices.length < 3) {
      choices.push({
        id: `synergy-${level}`,
        type: 'synergy',
        title: '连携强化',
        description: '反应伤害 +15%'
      });
    }

    if (choices.length < 3) {
      choices.push({
        id: `summoner-pickup-${level}`,
        type: 'summoner-stat',
        title: '召唤师感知',
        description: '拾取范围扩大'
      });
    }

    return choices.slice(0, 3);
  }

  public applyChoice(state: GameState, choice: UpgradeChoice): void {
    if (choice.type === 'new-pet' && choice.petId) {
      this.addPet(state, choice.petId);
    } else if (choice.type === 'pet-level' && choice.petId) {
      const pet = state.pets.find((item) => item.active && item.definition.id === choice.petId);
      if (pet) {
        pet.level = Math.min(5, pet.level + 1);
      }
    } else if (choice.type === 'synergy') {
      state.reactionDamageMultiplier += 0.15;
    } else {
      state.summoner.pickupRadius += 12;
      state.summoner.maxHp += 8;
      state.summoner.hp = Math.min(state.summoner.maxHp, state.summoner.hp + 8);
    }

    state.summoner.upgradeChoices = [];
    state.summoner.upgradePaused = false;
  }

  public addPet(state: GameState, petId: PetId): Pet | null {
    if (state.pets.some((pet) => pet.active && pet.definition.id === petId) || state.pets.length >= 5) {
      return null;
    }

    const definition = getPetDefinition(petId);
    const pet: Pet = {
      id: state.pets.length + 1,
      definition,
      active: true,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      level: 1,
      range: definition.range,
      damage: definition.damage,
      attackCooldown: definition.cooldown,
      cooldownRemaining: 0,
      targetScanTimer: 0,
      targetScanInterval: definition.targetScanInterval,
      targetId: null
    };

    state.pets.push(pet);
    return pet;
  }

  private describePet(petId: PetId): string {
    if (petId === 'flameImp') {
      return '火球爆炸，挂火标记';
    }
    if (petId === 'frostButterfly') {
      return '冰晶减速，挂冰标记';
    }
    if (petId === 'stormHawk') {
      return '闪电链弹射，挂雷标记';
    }
    if (petId === 'healingBloom') {
      return '周期回血和护盾';
    }
    return '近战撕咬，挂猎印';
  }
}
