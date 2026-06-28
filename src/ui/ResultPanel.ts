import type { RunResult } from '../entities/GameTypes';
import type { SaveData } from '../storage/SaveManager';

interface ResultPanelCallbacks {
  readonly onRetry: () => void;
  readonly onTitle: () => void;
}

export class ResultPanel {
  private readonly root: HTMLDivElement;
  private readonly title: HTMLDivElement;
  private readonly stats: HTMLDivElement;
  private visible = false;

  public constructor(parent: HTMLElement, private readonly callbacks: ResultPanelCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'result-panel hidden';

    this.title = document.createElement('div');
    this.title.className = 'result-title';

    this.stats = document.createElement('div');
    this.stats.className = 'result-stats';

    const actions = document.createElement('div');
    actions.className = 'result-actions';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'primary-action';
    retry.textContent = '再来一局';
    retry.addEventListener('click', () => this.callbacks.onRetry());

    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'secondary-action';
    titleButton.textContent = '成长';
    titleButton.addEventListener('click', () => this.callbacks.onTitle());

    actions.append(retry, titleButton);
    this.root.append(this.title, this.stats, actions);
    parent.append(this.root);
  }

  public show(result: RunResult, save: SaveData): void {
    this.visible = true;
    this.root.classList.remove('hidden');
    this.title.textContent = '本局结算';
    this.stats.textContent = `生存 ${Math.floor(result.runtime)}秒  击杀 ${result.kills}  连携 ${result.reactions}  获得 ${result.soulCrystals}魂晶  当前 ${save.soulCrystals}`;
  }

  public hide(): void {
    this.visible = false;
    this.root.classList.add('hidden');
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    this.root.remove();
  }
}
