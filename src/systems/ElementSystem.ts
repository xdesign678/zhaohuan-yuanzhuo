import { ELEMENT_MARK_DURATION, REACTION_COOLDOWN, REACTION_DEFS, REACTION_FRAME_CAP } from '../data/SynergyDefs';
import type { ElementType } from '../data/PetDefs';
import type { Enemy, GameState } from '../entities/GameTypes';

interface ElementApplyOptions {
  readonly canTriggerReaction: boolean;
}

export class ElementSystem {
  private readonly reactedThisFrame = new Set<number>();
  private reactionsThisFrame = 0;

  public beginFrame(): void {
    this.reactedThisFrame.clear();
    this.reactionsThisFrame = 0;
  }

  public update(state: GameState, deltaSeconds: number, now: number): void {
    for (const enemy of state.enemies) {
      if (!enemy.active) {
        continue;
      }

      this.expireMarks(enemy, now);

      if (enemy.slowUntil <= now) {
        enemy.slowMultiplier = 1;
      }

      if (enemy.defenseBreakUntil <= now) {
        enemy.damageTakenMultiplier = 1;
      }
    }

    if (deltaSeconds > 0 && state.reactionEvents.length > 12) {
      state.reactionEvents.splice(0, state.reactionEvents.length - 12);
    }
  }

  public applyElement(state: GameState, enemy: Enemy, element: ElementType, now: number, options: ElementApplyOptions): void {
    enemy.elementMarks[element] = {
      element,
      expireAt: now + ELEMENT_MARK_DURATION
    };

    if (options.canTriggerReaction) {
      this.tryTriggerReaction(state, enemy, now);
    }
  }

  private tryTriggerReaction(state: GameState, enemy: Enemy, now: number): void {
    if (enemy.reactionCooldownUntil > now || this.reactedThisFrame.has(enemy.id) || this.reactionsThisFrame >= REACTION_FRAME_CAP) {
      return;
    }

    for (const definition of REACTION_DEFS) {
      const [first, second] = definition.elements;
      if (!enemy.elementMarks[first] || !enemy.elementMarks[second]) {
        continue;
      }

      const boosted = enemy.huntMarkUntil > now;
      const boostMultiplier = boosted ? 1.5 : 1;
      const amount = definition.damage * boostMultiplier * state.reactionDamageMultiplier;

      delete enemy.elementMarks[first];
      delete enemy.elementMarks[second];
      enemy.reactionCooldownUntil = now + REACTION_COOLDOWN;
      this.reactedThisFrame.add(enemy.id);
      this.reactionsThisFrame += 1;
      state.stats.reactions += 1;
      state.damageEvents.push({
        enemyId: enemy.id,
        amount,
        canTriggerReaction: false
      });
      state.reactionEvents.push({
        enemyId: enemy.id,
        type: definition.type,
        x: enemy.x,
        y: enemy.y,
        boosted
      });

      if (definition.type === 'melt') {
        enemy.slowUntil = now + 1.2;
        enemy.slowMultiplier = 0.72;
      } else {
        enemy.defenseBreakUntil = now + 2.5;
        enemy.damageTakenMultiplier = 1.5;
      }

      return;
    }
  }

  private expireMarks(enemy: Enemy, now: number): void {
    const marks: ElementType[] = ['fire', 'ice', 'lightning'];
    for (const element of marks) {
      const mark = enemy.elementMarks[element];
      if (mark && mark.expireAt <= now) {
        delete enemy.elementMarks[element];
      }
    }
  }
}
