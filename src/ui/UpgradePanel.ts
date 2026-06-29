import type { UpgradeChoice } from '../data/UpgradeDefs';
import { bindPress } from './Press';

export class UpgradePanel {
  private readonly root: HTMLDivElement;
  private readonly cardWrap: HTMLDivElement;
  private visibleChoiceIds = '';

  public constructor(parent: HTMLElement, private readonly onChoose: (choiceId: string) => void) {
    this.root = document.createElement('div');
    this.root.className = 'upgrade-panel hidden';

    const title = document.createElement('div');
    title.className = 'upgrade-title';
    title.textContent = '选择一次召唤强化';

    this.cardWrap = document.createElement('div');
    this.cardWrap.className = 'upgrade-cards';

    this.root.append(title, this.cardWrap);
    parent.append(this.root);
  }

  public update(choices: readonly UpgradeChoice[]): void {
    if (choices.length === 0) {
      this.root.classList.add('hidden');
      this.visibleChoiceIds = '';
      this.cardWrap.replaceChildren();
      return;
    }

    const choiceIds = choices.map((choice) => choice.id).join('|');
    this.root.classList.remove('hidden');
    if (choiceIds === this.visibleChoiceIds) {
      return;
    }

    this.visibleChoiceIds = choiceIds;
    this.cardWrap.replaceChildren(...choices.map((choice) => this.createCard(choice)));
  }

  public destroy(): void {
    this.root.remove();
  }

  private createCard(choice: UpgradeChoice): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `upgrade-card ${choice.type}`;
    button.type = 'button';
    button.dataset.choiceId = choice.id;

    const title = document.createElement('span');
    title.className = 'upgrade-card-title';
    title.textContent = choice.title;

    const description = document.createElement('span');
    description.className = 'upgrade-card-description';
    description.textContent = choice.description;

    button.append(title, description);
    bindPress(button, () => {
      this.onChoose(choice.id);
    });

    return button;
  }
}
