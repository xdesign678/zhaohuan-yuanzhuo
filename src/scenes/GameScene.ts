import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import type { Enemy, Gem } from '../entities/GameTypes';
import { GameSimulation } from '../systems/GameSimulation';
import { DragMovementController } from '../ui/DragInput';
import { HUD } from '../ui/HUD';
import { UpgradePanel } from '../ui/UpgradePanel';

const PLAYER_SIZE = 42;
const PLAYER_SPEED = 520;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Rectangle;
  private movement!: DragMovementController;
  private simulation!: GameSimulation;
  private hud!: HUD;
  private upgradePanel!: UpgradePanel;
  private readonly petViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private readonly enemyViews = new Map<number, Phaser.GameObjects.Rectangle>();
  private readonly gemViews = new Map<number, Phaser.GameObjects.Arc>();
  private readonly fpsSamples = new Array<number>(90).fill(60);
  private fpsSampleIndex = 0;
  private fpsSampleCount = 0;

  public constructor() {
    super('GameScene');
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#09080d');
    this.createBackdrop();

    this.simulation = this.createSimulationFromUrl();
    const startX = this.simulation.state.summoner.x;
    const startY = this.simulation.state.summoner.y;
    this.player = this.add
      .rectangle(startX, startY, PLAYER_SIZE, PLAYER_SIZE, 0x78f2c4, 1)
      .setStrokeStyle(2, 0x16101f);

    const halfSize = PLAYER_SIZE / 2;
    this.movement = new DragMovementController({
      minX: halfSize,
      minY: halfSize,
      maxX: GAME_WIDTH - halfSize,
      maxY: GAME_HEIGHT - halfSize
    });
    this.movement.snapTo({ x: startX, y: startY });
    this.hud = new HUD(document.body);
    this.upgradePanel = new UpgradePanel(document.body, (choiceId) => {
      this.simulation.chooseUpgrade(choiceId);
    });

    this.input.addPointer(4);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerEnd, this);
    this.input.on('pointerupoutside', this.handlePointerEnd, this);
    this.input.on('pointercancel', this.handlePointerEnd, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroyScene, this);
  }

  public update(_time: number, delta: number): void {
    this.recordFrame(delta);
    this.moveSummoner(delta);
    this.simulation.update(delta / 1000);
    this.renderSimulation();
  }

  public getM1Snapshot(): { enemyCount: number; kills: number; level: number; fps: number } {
    return {
      enemyCount: this.simulation.countActiveEnemies(),
      kills: this.simulation.state.summoner.kills,
      level: this.simulation.state.summoner.level,
      fps: this.getAverageFps()
    };
  }

  public getM2Snapshot(): { petCount: number; upgradeChoiceCount: number; reactions: number; petNames: string[]; fps: number } {
    return {
      petCount: this.simulation.state.pets.filter((pet) => pet.active).length,
      upgradeChoiceCount: this.simulation.state.summoner.upgradeChoices.length,
      reactions: this.simulation.state.stats.reactions,
      petNames: this.simulation.state.pets.filter((pet) => pet.active).map((pet) => pet.definition.name),
      fps: this.getAverageFps()
    };
  }

  private moveSummoner(delta: number): void {
    const summoner = this.simulation.state.summoner;
    const dx = this.movement.targetX - summoner.x;
    const dy = this.movement.targetY - summoner.y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= 0.01) {
      return;
    }

    const maxStep = PLAYER_SPEED * (delta / 1000);

    if (distanceSquared <= maxStep * maxStep) {
      this.simulation.setSummonerPosition(this.movement.targetX, this.movement.targetY);
      return;
    }

    const distance = Math.sqrt(distanceSquared);
    this.simulation.setSummonerPosition(summoner.x + (dx / distance) * maxStep, summoner.y + (dy / distance) * maxStep);
  }

  private renderSimulation(): void {
    const state = this.simulation.state;
    this.player.setPosition(state.summoner.x, state.summoner.y);

    this.renderPets();

    this.renderEnemies(state.enemies);
    this.renderGems(state.gems);
    this.hud.update(state, this.simulation.countActiveEnemies(), this.getAverageFps());
    this.upgradePanel.update(state.summoner.upgradeChoices);
  }

  private renderPets(): void {
    for (const pet of this.simulation.state.pets) {
      let view = this.petViews.get(pet.id);
      if (!view) {
        view = this.add.rectangle(pet.x, pet.y, 22, 22, pet.definition.color, 1).setStrokeStyle(2, 0x16101f);
        this.petViews.set(pet.id, view);
      }

      view.setVisible(pet.active);
      if (pet.active) {
        view.setFillStyle(pet.definition.color, 1);
        view.setPosition(pet.x, pet.y);
      }
    }
  }

  private renderEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = this.add.rectangle(enemy.x, enemy.y, enemy.radius * 2, enemy.radius * 2, 0x9a3f58, 1).setStrokeStyle(1, 0x1b1018);
        this.enemyViews.set(enemy.id, view);
      }

      view.setVisible(enemy.active);
      if (enemy.active) {
        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        view.setFillStyle(hpRatio > 0.5 ? 0x9a3f58 : 0xd46a62, 1);
        view.setPosition(enemy.x, enemy.y);
      }
    }
  }

  private renderGems(gems: Gem[]): void {
    for (const gem of gems) {
      let view = this.gemViews.get(gem.id);
      if (!view) {
        view = this.add.circle(gem.x, gem.y, gem.radius, 0x5cd6ff, 1).setStrokeStyle(1, 0x10212e);
        this.gemViews.set(gem.id, view);
      }

      view.setVisible(gem.active);
      if (gem.active) {
        view.setPosition(gem.x, gem.y);
      }
    }
  }

  private recordFrame(delta: number): void {
    const fps = delta > 0 ? 1000 / delta : 60;
    this.fpsSamples[this.fpsSampleIndex] = fps;
    this.fpsSampleIndex = (this.fpsSampleIndex + 1) % this.fpsSamples.length;
    this.fpsSampleCount = Math.min(this.fpsSampleCount + 1, this.fpsSamples.length);
  }

  private getAverageFps(): number {
    if (this.fpsSampleCount === 0) {
      return 60;
    }

    let total = 0;
    for (let index = 0; index < this.fpsSampleCount; index += 1) {
      total += this.fpsSamples[index] ?? 60;
    }

    return total / this.fpsSampleCount;
  }

  private createBackdrop(): void {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x09080d, 1);

    for (let y = 32; y < GAME_HEIGHT; y += 64) {
      this.add.line(0, 0, 0, y, GAME_WIDTH, y, 0x181420, 0.45).setOrigin(0, 0);
    }

    for (let x = 40; x < GAME_WIDTH; x += 80) {
      this.add.line(0, 0, x, 0, x, GAME_HEIGHT, 0x15111d, 0.35).setOrigin(0, 0);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    this.preventNativeGesture(pointer);
    this.movement.start(pointer.id, { x: pointer.x, y: pointer.y }, { x: this.simulation.state.summoner.x, y: this.simulation.state.summoner.y });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.preventNativeGesture(pointer);
    this.movement.move(pointer.id, { x: pointer.x, y: pointer.y });
  }

  private handlePointerEnd(pointer: Phaser.Input.Pointer): void {
    this.preventNativeGesture(pointer);
    this.movement.end(pointer.id);
  }

  private preventNativeGesture(pointer: Phaser.Input.Pointer): void {
    pointer.event?.preventDefault();
  }

  private createSimulationFromUrl(): GameSimulation {
    const params = new URLSearchParams(window.location.search);
    if (params.get('m1perf') === '1') {
      return GameSimulation.createForPerformanceGate();
    }
    if (params.get('m2all') === '1') {
      return GameSimulation.createForM2Gate();
    }
    if (params.get('m2upgrade') === '1') {
      return GameSimulation.createForUpgradeGate();
    }
    return GameSimulation.create();
  }

  private destroyScene(): void {
    this.hud.destroy();
    this.upgradePanel.destroy();
  }
}
