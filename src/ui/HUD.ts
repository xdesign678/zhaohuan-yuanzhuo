import type { GameState } from '../entities/GameTypes';

export class HUD {
  private readonly root: HTMLDivElement;
  private readonly topLine: HTMLDivElement;
  private readonly healthLine: HTMLDivElement;
  private readonly petLine: HTMLDivElement;
  private readonly xpFill: HTMLDivElement;
  private readonly hpFill: HTMLDivElement;
  private readonly reactionFlash: HTMLDivElement;
  private lastReactionCount = 0;
  private reactionVisibleUntil = 0;

  public constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'game-hud';

    this.topLine = document.createElement('div');
    this.topLine.className = 'hud-row hud-top';

    this.healthLine = document.createElement('div');
    this.healthLine.className = 'hud-row hud-health';

    const hpBar = document.createElement('div');
    hpBar.className = 'hp-bar';
    this.hpFill = document.createElement('div');
    this.hpFill.className = 'hp-fill';
    hpBar.append(this.hpFill);

    this.petLine = document.createElement('div');
    this.petLine.className = 'hud-row hud-pet';

    const xpBar = document.createElement('div');
    xpBar.className = 'xp-bar';
    this.xpFill = document.createElement('div');
    this.xpFill.className = 'xp-fill';
    xpBar.append(this.xpFill);

    this.reactionFlash = document.createElement('div');
    this.reactionFlash.className = 'reaction-flash hidden';

    this.root.append(this.topLine, this.healthLine, hpBar, this.petLine, xpBar, this.reactionFlash);
    parent.append(this.root);
  }

  public update(state: GameState, activeEnemies: number, fps: number): void {
    const summoner = state.summoner;
    const minutes = Math.floor(state.stats.runtime / 60);
    const seconds = Math.floor(state.stats.runtime % 60)
      .toString()
      .padStart(2, '0');
    const xpPercent = summoner.xpToNext > 0 ? Math.min(100, (summoner.xp / summoner.xpToNext) * 100) : 0;
    const petText = state.pets
      .filter((pet) => pet.active)
      .map((pet) => `${pet.definition.name}${pet.level}`)
      .join('  ');

    this.topLine.textContent = `${minutes}:${seconds}  Lv${summoner.level}  Kill ${summoner.kills}  Enemy ${activeEnemies}  ${Math.round(fps)}fps`;
    this.healthLine.textContent = `HP ${Math.ceil(summoner.hp)}/${summoner.maxHp}  Shield ${Math.floor(summoner.shield)}  Reaction ${state.stats.reactions}`;
    this.petLine.textContent = petText || '无宠物';
    this.hpFill.style.width = `${summoner.maxHp > 0 ? Math.max(0, Math.min(100, (summoner.hp / summoner.maxHp) * 100)) : 0}%`;
    this.xpFill.style.width = `${xpPercent}%`;
    this.updateReactionFlash(state);
  }

  public destroy(): void {
    this.root.remove();
  }

  private updateReactionFlash(state: GameState): void {
    const now = Date.now();
    if (state.stats.reactions > this.lastReactionCount) {
      const last = state.reactionEvents[state.reactionEvents.length - 1];
      this.lastReactionCount = state.stats.reactions;
      this.reactionVisibleUntil = now + 900;
      this.reactionFlash.textContent = last?.type === 'superconduct' ? '超导' : '融化';
      this.reactionFlash.classList.toggle('boosted', Boolean(last?.boosted));
      this.reactionFlash.classList.remove('hidden');
    }

    if (now > this.reactionVisibleUntil) {
      this.reactionFlash.classList.add('hidden');
    }
  }
}
