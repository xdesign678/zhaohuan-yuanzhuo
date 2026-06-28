import { BALANCE } from '../data/Balance';
import type { GameState } from '../entities/GameTypes';

export class EnemySystem {
  public update(state: GameState, deltaSeconds: number, playerDamageEnabled: boolean): void {
    const summoner = state.summoner;

    for (const enemy of state.enemies) {
      if (!enemy.active) {
        continue;
      }

      enemy.contactCooldownRemaining = Math.max(0, enemy.contactCooldownRemaining - deltaSeconds);
      const dx = summoner.x - enemy.x;
      const dy = summoner.y - enemy.y;
      const distanceSquared = dx * dx + dy * dy;
      const contactRadius = summoner.radius + enemy.radius;

      if (playerDamageEnabled && distanceSquared <= contactRadius * contactRadius) {
        this.applyContactDamage(state, enemy);
        continue;
      }

      if (distanceSquared <= 0.01) {
        continue;
      }

      const distance = Math.sqrt(distanceSquared);
      const speedMultiplier = enemy.slowUntil > state.stats.runtime ? enemy.slowMultiplier : 1;
      const step = enemy.speed * speedMultiplier * deltaSeconds;
      enemy.x += (dx / distance) * step;
      enemy.y += (dy / distance) * step;
    }
  }

  private applyContactDamage(state: GameState, enemy: GameState['enemies'][number]): void {
    if (enemy.contactCooldownRemaining > 0 || state.runStatus !== 'playing') {
      return;
    }

    let remainingDamage = BALANCE.enemy.contactDamage;
    if (state.summoner.shield > 0) {
      const absorbed = Math.min(state.summoner.shield, remainingDamage);
      state.summoner.shield -= absorbed;
      remainingDamage -= absorbed;
    }

    if (remainingDamage > 0) {
      state.summoner.hp = Math.max(0, state.summoner.hp - remainingDamage);
    }

    state.summoner.hitFlashUntil = state.stats.runtime + 0.24;
    enemy.contactCooldownRemaining = BALANCE.enemy.contactInterval;

    if (state.summoner.hp <= 0) {
      state.runStatus = 'gameOver';
      state.summoner.upgradePaused = false;
      state.summoner.upgradeChoices = [];
    }
  }
}
