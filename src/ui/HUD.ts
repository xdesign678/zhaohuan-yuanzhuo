import type { GameState } from '../entities/GameTypes';

export class HUD {
  private readonly root: HTMLDivElement;
  private readonly topLine: HTMLDivElement;
  private readonly petLine: HTMLDivElement;
  private readonly xpFill: HTMLDivElement;

  public constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'game-hud';

    this.topLine = document.createElement('div');
    this.topLine.className = 'hud-row hud-top';

    this.petLine = document.createElement('div');
    this.petLine.className = 'hud-row hud-pet';

    const xpBar = document.createElement('div');
    xpBar.className = 'xp-bar';
    this.xpFill = document.createElement('div');
    this.xpFill.className = 'xp-fill';
    xpBar.append(this.xpFill);

    this.root.append(this.topLine, this.petLine, xpBar);
    parent.append(this.root);
  }

  public update(state: GameState, activeEnemies: number, fps: number): void {
    const summoner = state.summoner;
    const pet = state.pets[0];
    const minutes = Math.floor(state.stats.runtime / 60);
    const seconds = Math.floor(state.stats.runtime % 60)
      .toString()
      .padStart(2, '0');
    const xpPercent = summoner.xpToNext > 0 ? Math.min(100, (summoner.xp / summoner.xpToNext) * 100) : 0;

    this.topLine.textContent = `${minutes}:${seconds}  Lv ${summoner.level}  Kill ${summoner.kills}  Enemy ${activeEnemies}  ${Math.round(fps)}fps`;
    this.petLine.textContent = pet ? `剑齿狼 Lv ${pet.level}  DMG ${pet.damage + (pet.level - 1) * 2}` : '无宠物';
    this.xpFill.style.width = `${xpPercent}%`;
  }

  public destroy(): void {
    this.root.remove();
  }
}
