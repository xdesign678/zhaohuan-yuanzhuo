import { GROWTH_DEFS, GROWTH_NODE_IDS, type GrowthNodeId } from '../data/GrowthDefs';
import type { SaveData } from '../storage/SaveManager';

interface TitleScreenCallbacks {
  readonly onStart: () => void;
  readonly onBuyGrowth: (nodeId: GrowthNodeId) => void;
}

export class TitleScreen {
  private readonly root: HTMLDivElement;
  private readonly summary: HTMLDivElement;
  private readonly growthList: HTMLDivElement;
  private visible = false;

  public constructor(parent: HTMLElement, titleImageUrl: string, private readonly callbacks: TitleScreenCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'title-screen hidden';

    const art = document.createElement('img');
    art.className = 'title-art';
    art.alt = '召唤远卓';
    art.src = titleImageUrl;

    const titleBlock = document.createElement('div');
    titleBlock.className = 'title-block';

    const title = document.createElement('h1');
    title.textContent = '召唤远卓';

    this.summary = document.createElement('div');
    this.summary.className = 'title-summary';

    const startButton = document.createElement('button');
    startButton.className = 'primary-action';
    startButton.type = 'button';
    startButton.textContent = '开始';
    startButton.addEventListener('click', () => this.callbacks.onStart());

    this.growthList = document.createElement('div');
    this.growthList.className = 'growth-list';

    titleBlock.append(title, this.summary, startButton, this.growthList);
    this.root.append(art, titleBlock);
    parent.append(this.root);
  }

  public show(save: SaveData, usedFallback: boolean): void {
    this.visible = true;
    this.root.classList.remove('hidden');
    this.update(save, usedFallback);
  }

  public hide(): void {
    this.visible = false;
    this.root.classList.add('hidden');
  }

  public update(save: SaveData, usedFallback: boolean): void {
    this.summary.textContent = `魂晶 ${save.soulCrystals}  最佳 ${save.bestKills}杀 / ${Math.floor(save.bestTime)}秒${usedFallback ? '  已回退默认档' : ''}`;
    this.growthList.replaceChildren();

    for (const id of GROWTH_NODE_IDS) {
      const definition = GROWTH_DEFS[id];
      const level = save.growth[id] ?? 0;
      const cost = definition.costs[level];
      const maxLevel = definition.costs.length;
      const button = document.createElement('button');
      button.className = 'growth-node';
      button.type = 'button';
      button.dataset.nodeId = id;
      button.disabled = cost === undefined || save.soulCrystals < cost;

      const name = document.createElement('span');
      name.className = 'growth-name';
      name.textContent = `${definition.name} ${level}/${maxLevel}`;

      const detail = document.createElement('span');
      detail.className = 'growth-detail';
      detail.textContent = cost === undefined ? definition.description : `${definition.description} · ${cost}魂晶`;

      button.append(name, detail);
      button.addEventListener('click', () => this.callbacks.onBuyGrowth(id));
      this.growthList.append(button);
    }
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public destroy(): void {
    this.root.remove();
  }
}
