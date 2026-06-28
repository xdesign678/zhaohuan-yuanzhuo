import atlasJsonUrl from '../../assets/atlas/m3-atlas.json?url';
import atlasPngUrl from '../../assets/atlas/m3-atlas.png?url';
import titleSplashUrl from '../../assets/atlas/title-splash.png?url';
import { GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import { GROWTH_NODE_IDS, type GrowthNodeId } from '../data/GrowthDefs';
import type { Enemy, Gem } from '../entities/GameTypes';
import { SaveManager, type SaveData } from '../storage/SaveManager';
import { GameSimulation } from '../systems/GameSimulation';
import { buyGrowthNode } from '../systems/MetaProgressionSystem';
import { DragMovementController } from '../ui/DragInput';
import { HUD } from '../ui/HUD';
import { ResultPanel } from '../ui/ResultPanel';
import { TitleScreen } from '../ui/TitleScreen';
import { UpgradePanel } from '../ui/UpgradePanel';
import { AssetKeys } from '../utils/AssetKeys';

const PLAYER_SIZE = 42;
const PLAYER_SPEED = 520;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private movement!: DragMovementController;
  private simulation!: GameSimulation;
  private saveManager!: SaveManager;
  private saveData!: SaveData;
  private hud!: HUD;
  private titleScreen!: TitleScreen;
  private resultPanel!: ResultPanel;
  private upgradePanel!: UpgradePanel;
  private damageVignette!: HTMLDivElement;
  private readonly petViews = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly enemyViews = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly gemViews = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly fpsSamples = new Array<number>(90).fill(60);
  private fpsSampleIndex = 0;
  private fpsSampleCount = 0;
  private lastSummonerX = GAME_WIDTH / 2;
  private isPlaying = false;
  private saveFallbackUsed = false;

  public constructor() {
    super('GameScene');
  }

  public preload(): void {
    this.load.atlas(AssetKeys.atlas, atlasPngUrl, atlasJsonUrl);
    this.load.image(AssetKeys.titleSplash, titleSplashUrl);
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#09080d');
    this.createBackdrop();

    this.saveManager = new SaveManager();
    const loadedSave = this.saveManager.load();
    this.saveData = loadedSave.data;
    this.saveFallbackUsed = loadedSave.usedFallback;
    this.simulation = this.createSimulationFromUrl(this.saveData);
    const startX = this.simulation.state.summoner.x;
    const startY = this.simulation.state.summoner.y;
    this.player = this.add
      .sprite(startX, startY, AssetKeys.atlas, AssetKeys.summoner)
      .setOrigin(0.5)
      .setDepth(4);
    this.tweens.add({
      targets: this.player,
      scale: 1.05,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.damageVignette = document.createElement('div');
    this.damageVignette.className = 'damage-vignette hidden';
    document.body.append(this.damageVignette);

    const halfSize = PLAYER_SIZE / 2;
    this.movement = new DragMovementController({
      minX: halfSize,
      minY: halfSize,
      maxX: GAME_WIDTH - halfSize,
      maxY: GAME_HEIGHT - halfSize
    });
    this.movement.snapTo({ x: startX, y: startY });
    this.hud = new HUD(document.body);
    this.titleScreen = new TitleScreen(document.body, titleSplashUrl, {
      onStart: () => this.startRun(),
      onBuyGrowth: (nodeId) => this.buyGrowth(nodeId)
    });
    this.resultPanel = new ResultPanel(document.body, {
      onRetry: () => this.startRun(),
      onTitle: () => this.showTitle()
    });
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

    if (this.shouldAutostart()) {
      this.startRun();
    } else {
      this.showTitle();
      this.renderSimulation();
    }
  }

  public update(_time: number, delta: number): void {
    this.recordFrame(delta);
    if (!this.isPlaying) {
      this.renderSimulation();
      return;
    }

    this.moveSummoner(delta);
    this.simulation.update(delta / 1000);
    if (this.simulation.state.runStatus === 'gameOver') {
      this.finishRun();
    }
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

  public getM3Snapshot(): { atlasLoaded: boolean; frameCount: number; spriteCount: number; titleLoaded: boolean } {
    const atlas = this.textures.get(AssetKeys.atlas);
    return {
      atlasLoaded: this.textures.exists(AssetKeys.atlas),
      frameCount: atlas ? atlas.getFrameNames().length : 0,
      spriteCount: this.petViews.size + this.enemyViews.size + this.gemViews.size + 1,
      titleLoaded: this.textures.exists(AssetKeys.titleSplash)
    };
  }

  public getM4Snapshot(): {
    titleVisible: boolean;
    resultVisible: boolean;
    growthNodeCount: number;
    growthLevels: Record<GrowthNodeId, number>;
    soulCrystals: number;
    saveFallbackUsed: boolean;
    runStatus: 'playing' | 'gameOver';
    lastRunSoulCrystals: number;
    persistedRuns: number;
    hp: number;
    shield: number;
  } {
    return {
      titleVisible: this.titleScreen.isVisible(),
      resultVisible: this.resultPanel.isVisible(),
      growthNodeCount: GROWTH_NODE_IDS.length,
      growthLevels: { ...this.saveData.growth },
      soulCrystals: this.saveData.soulCrystals,
      saveFallbackUsed: this.saveFallbackUsed,
      runStatus: this.simulation.state.runStatus,
      lastRunSoulCrystals: this.simulation.state.lastRunResult?.soulCrystals ?? 0,
      persistedRuns: this.saveData.runs,
      hp: this.simulation.state.summoner.hp,
      shield: this.simulation.state.summoner.shield
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

    const maxStep = PLAYER_SPEED * summoner.moveSpeedMultiplier * (delta / 1000);

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
    if (Math.abs(state.summoner.x - this.lastSummonerX) > 0.4) {
      this.player.setFlipX(state.summoner.x < this.lastSummonerX);
      this.lastSummonerX = state.summoner.x;
    }

    this.renderPets();

    this.renderEnemies(state.enemies);
    this.renderGems(state.gems);
    this.hud.update(state, this.simulation.countActiveEnemies(), this.getAverageFps());
    this.upgradePanel.update(state.summoner.upgradeChoices);
    this.damageVignette.classList.toggle('hidden', state.summoner.hitFlashUntil <= state.stats.runtime);
  }

  private renderPets(): void {
    for (const pet of this.simulation.state.pets) {
      let view = this.petViews.get(pet.id);
      if (!view) {
        view = this.add.sprite(pet.x, pet.y, AssetKeys.atlas, AssetKeys.pets[pet.definition.id]).setOrigin(0.5).setDepth(3);
        this.petViews.set(pet.id, view);
        this.tweens.add({
          targets: view,
          scale: 1.08,
          duration: 760 + pet.id * 80,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      view.setVisible(pet.active);
      if (pet.active) {
        view.setPosition(pet.x, pet.y);
      }
    }
  }

  private renderEnemies(enemies: Enemy[]): void {
    for (const enemy of enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        view = this.add.sprite(enemy.x, enemy.y, AssetKeys.atlas, this.frameForEnemy(enemy)).setOrigin(0.5).setDepth(2);
        this.enemyViews.set(enemy.id, view);
      }

      view.setVisible(enemy.active);
      if (enemy.active) {
        const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
        view.setFrame(this.frameForEnemy(enemy));
        if (hpRatio <= 0.5) {
          view.setTint(0xff8585);
        } else {
          view.clearTint();
        }
        view.setFlipX(enemy.x > this.simulation.state.summoner.x);
        view.setPosition(enemy.x, enemy.y);
      }
    }
  }

  private renderGems(gems: Gem[]): void {
    for (const gem of gems) {
      let view = this.gemViews.get(gem.id);
      if (!view) {
        view = this.add.sprite(gem.x, gem.y, AssetKeys.atlas, AssetKeys.pickups.xpGem).setOrigin(0.5).setDepth(1);
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
    this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, AssetKeys.atlas, AssetKeys.tiles.dark).setDepth(0).setAlpha(0.85);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isPlaying) {
      return;
    }
    this.preventNativeGesture(pointer);
    this.movement.start(pointer.id, { x: pointer.x, y: pointer.y }, { x: this.simulation.state.summoner.x, y: this.simulation.state.summoner.y });
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isPlaying) {
      return;
    }
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

  private createSimulationFromUrl(saveData: SaveData): GameSimulation {
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
    return GameSimulation.create({ saveData });
  }

  private destroyScene(): void {
    this.hud.destroy();
    this.titleScreen.destroy();
    this.resultPanel.destroy();
    this.upgradePanel.destroy();
    this.damageVignette.remove();
  }

  private frameForEnemy(enemy: Enemy): string {
    if (enemy.radius >= 40) {
      return AssetKeys.boss;
    }
    if (enemy.maxHp >= 42) {
      return AssetKeys.elites[enemy.id % AssetKeys.elites.length];
    }
    return AssetKeys.enemies[enemy.id % AssetKeys.enemies.length];
  }

  private startRun(): void {
    this.simulation = this.createSimulationFromUrl(this.saveData);
    this.syncPlayerToSimulation();
    this.titleScreen.hide();
    this.resultPanel.hide();
    this.isPlaying = true;
    this.applyM4GameOverProbe();
  }

  private showTitle(): void {
    this.isPlaying = false;
    this.simulation = GameSimulation.create({ saveData: this.saveData });
    this.syncPlayerToSimulation();
    this.resultPanel.hide();
    this.titleScreen.show(this.saveData, this.saveFallbackUsed);
  }

  private buyGrowth(nodeId: GrowthNodeId): void {
    const result = buyGrowthNode(this.saveData, nodeId);
    if (result.purchased) {
      this.saveManager.save(this.saveData);
      this.titleScreen.update(this.saveData, this.saveFallbackUsed);
    }
  }

  private finishRun(): void {
    if (this.simulation.state.runSettled) {
      return;
    }

    const result = this.simulation.settleRun(this.saveData);
    this.saveManager.save(this.saveData);
    this.isPlaying = false;
    this.upgradePanel.update([]);
    this.resultPanel.show(result, this.saveData);
  }

  private shouldAutostart(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.get('m4autostart') === '1' || params.get('m1perf') === '1' || params.get('m2all') === '1' || params.get('m2upgrade') === '1';
  }

  private applyM4GameOverProbe(): void {
    const params = new URLSearchParams(window.location.search);
    if (params.get('m4gameover') !== '1') {
      return;
    }

    this.simulation.state.summoner.hp = 1;
    this.simulation.state.summoner.kills = 7;
    this.simulation.spawnEnemyForTest(this.simulation.state.summoner.x, this.simulation.state.summoner.y, 50);
  }

  private syncPlayerToSimulation(): void {
    const summoner = this.simulation.state.summoner;
    this.movement.snapTo({ x: summoner.x, y: summoner.y });
    this.player.setPosition(summoner.x, summoner.y);
    this.lastSummonerX = summoner.x;
  }
}
