import { describe, expect, it } from 'vitest';
import { GameSimulation } from '../src/systems/GameSimulation';
import { UpgradeSystem } from '../src/systems/UpgradeSystem';

describe('UpgradeSystem', () => {
  it('offers three upgrade choices with existing pets prioritized', () => {
    const game = GameSimulation.createForTest();
    const upgradeSystem = new UpgradeSystem();

    const choices = upgradeSystem.createChoices(game.state, 2);

    expect(choices).toHaveLength(3);
    expect(choices.some((choice) => choice.type === 'pet-level' && choice.petId === game.state.pets[0]?.definition.id)).toBe(true);
  });

  it('adds new pets and caps pet level at five', () => {
    const game = GameSimulation.createForTest();
    const upgradeSystem = new UpgradeSystem();

    upgradeSystem.applyChoice(game.state, {
      id: 'summon-flameImp',
      type: 'new-pet',
      petId: 'flameImp',
      title: '召唤焰魔',
      description: '加入火焰宠物'
    });

    expect(game.state.pets.map((pet) => pet.definition.id)).toContain('flameImp');

    const wolf = game.state.pets[0];
    if (!wolf) {
      throw new Error('Expected starter pet');
    }

    for (let index = 0; index < 8; index += 1) {
      upgradeSystem.applyChoice(game.state, {
        id: `level-${index}`,
        type: 'pet-level',
        petId: wolf.definition.id,
        title: '剑齿狼升阶',
        description: '提升剑齿狼等级'
      });
    }

    expect(wolf.level).toBe(5);
  });
});
