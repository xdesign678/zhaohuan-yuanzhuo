import { EntityManager } from '../core/EntityManager';
import { SpatialGrid } from '../core/SpatialGrid';
import { BALANCE, GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import { getPetDefinition, PET_DEFS, type PetId } from '../data/PetDefs';
import type { SaveData } from '../storage/SaveManager';
import type { Enemy, GameState, Pet, RunResult } from '../entities/GameTypes';
import { CombatSystem } from './CombatSystem';
import { ElementSystem } from './ElementSystem';
import { EnemySystem } from './EnemySystem';
import { getGrowthBonuses, type GrowthBonuses } from './MetaProgressionSystem';
import { PetAISystem } from './PetAISystem';
import { SpawnSystem } from './SpawnSystem';
import { UpgradeSystem } from './UpgradeSystem';
import { XPSystem } from './XPSystem';
import { createPerformanceSettings, type PerformanceSettings } from '../utils/DeviceDetect';

interface GameSimulationOptions {
  readonly autoSpawn: boolean;
  readonly initialEnemies: number;
  readonly combatEnabled: boolean;
  readonly playerDamageEnabled: boolean;
  readonly saveData?: SaveData;
  readonly performanceSettings?: PerformanceSettings;
}

export class GameSimulation {
  public readonly state: GameState;
  private readonly growthBonuses: GrowthBonuses;

  private readonly entities = new EntityManager();
  private readonly enemyGrid = new SpatialGrid<Enemy>(BALANCE.spatialGrid.cellSize);
  private readonly spawnSystem = new SpawnSystem();
  private readonly enemySystem = new EnemySystem();
  private readonly petSystem = new PetAISystem(this.enemyGrid);
  private readonly elementSystem = new ElementSystem();
  private readonly upgradeSystem = new UpgradeSystem();
  private readonly combatSystem = new CombatSystem(this.elementSystem);
  private readonly xpSystem = new XPSystem(this.upgradeSystem);
  private readonly performanceSettings: PerformanceSettings;

  private constructor(private readonly options: GameSimulationOptions) {
    this.growthBonuses = options.saveData ? getGrowthBonuses(options.saveData) : getDefaultBonuses();
    this.performanceSettings = options.performanceSettings ?? createPerformanceSettings();
    const maxHp = 100 + this.growthBonuses.maxHpBonus;
    const startingPetLevel = Math.min(5, 1 + this.growthBonuses.startingPetLevelBonus);
    this.state = {
      summoner: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        radius: BALANCE.summoner.radius,
        hp: maxHp,
        maxHp,
        shield: 0,
        moveSpeedMultiplier: this.growthBonuses.moveSpeedMultiplier,
        xpMultiplier: this.growthBonuses.xpMultiplier,
        level: 1,
        xp: 0,
        xpToNext: BALANCE.summoner.baseXpToNext,
        pickupRadius: BALANCE.summoner.pickupRadius + this.growthBonuses.pickupRadiusBonus,
        kills: 0,
        hitFlashUntil: 0,
        damageCooldownUntil: 0,
        upgradeChoices: [],
        upgradePaused: false
      },
      enemies: this.entities.enemies,
      pets: [this.createPet('saberWolf', 1, startingPetLevel)],
      gems: this.entities.gems,
      damageEvents: [],
      reactionEvents: [],
      stats: {
        runtime: 0,
        spawned: 0,
        reactions: 0
      },
      performance: this.performanceSettings,
      reactionDamageMultiplier: this.growthBonuses.reactionDamageMultiplier,
      soulCrystalMultiplier: this.growthBonuses.soulCrystalMultiplier,
      runStatus: 'playing',
      runSettled: false,
      lastRunResult: null
    };

    if (options.initialEnemies > 0) {
      this.spawnSystem.spawnStressPack(this.state, this.entities, options.initialEnemies);
    }
  }

  public static create(options: Pick<GameSimulationOptions, 'saveData' | 'performanceSettings'> = {}): GameSimulation {
    return new GameSimulation({
      autoSpawn: true,
      initialEnemies: 0,
      combatEnabled: true,
      playerDamageEnabled: true,
      saveData: options.saveData,
      performanceSettings: options.performanceSettings
    });
  }

  public static createForPerformanceGate(): GameSimulation {
    return new GameSimulation({
      autoSpawn: true,
      initialEnemies: 200,
      combatEnabled: false,
      playerDamageEnabled: false,
      performanceSettings: createPerformanceSettings({ forcedTier: 'high' })
    });
  }

  public static createForTest(options: Pick<GameSimulationOptions, 'saveData' | 'performanceSettings'> = {}): GameSimulation {
    return new GameSimulation({
      autoSpawn: false,
      initialEnemies: 0,
      combatEnabled: true,
      playerDamageEnabled: true,
      saveData: options.saveData,
      performanceSettings: options.performanceSettings
    });
  }

  public static createForM2Gate(): GameSimulation {
    const simulation = new GameSimulation({
      autoSpawn: false,
      initialEnemies: 0,
      combatEnabled: true,
      playerDamageEnabled: false,
      performanceSettings: createPerformanceSettings({ forcedTier: 'high' })
    });
    simulation.addAllPetsForTest();
    simulation.spawnEnemyForTest(220, 320, 180);
    simulation.spawnEnemyForTest(240, 330, 120);
    simulation.spawnEnemyForTest(250, 300, 120);
    return simulation;
  }

  public static createForUpgradeGate(): GameSimulation {
    const simulation = new GameSimulation({
      autoSpawn: false,
      initialEnemies: 0,
      combatEnabled: true,
      playerDamageEnabled: false,
      performanceSettings: createPerformanceSettings({ forcedTier: 'high' })
    });
    simulation.spawnGemForTest(simulation.state.summoner.x, simulation.state.summoner.y, BALANCE.summoner.baseXpToNext);
    return simulation;
  }

  public update(deltaSeconds: number): void {
    if (this.state.runStatus === 'gameOver') {
      return;
    }

    if (this.state.summoner.upgradePaused) {
      return;
    }

    this.state.stats.runtime += deltaSeconds;
    this.elementSystem.beginFrame();

    if (this.options.autoSpawn) {
      this.spawnSystem.update(this.state, this.entities, deltaSeconds);
    }

    this.rebuildEnemyGrid();

    if (this.options.combatEnabled) {
      this.petSystem.update(this.state, deltaSeconds);
      this.combatSystem.update(this.state, this.entities, deltaSeconds);
    }

    this.enemySystem.update(this.state, deltaSeconds, this.options.playerDamageEnabled);
    this.elementSystem.update(this.state, deltaSeconds, this.state.stats.runtime);
    this.xpSystem.update(this.state, this.entities, deltaSeconds);
  }

  public settleRun(saveData: SaveData): RunResult {
    if (this.state.runStatus !== 'gameOver' || this.state.runSettled) {
      return {
        kills: this.state.summoner.kills,
        runtime: this.state.stats.runtime,
        reactions: this.state.stats.reactions,
        soulCrystals: 0,
        totalSoulCrystals: saveData.soulCrystals
      };
    }

    const rewardBase =
      Math.floor(this.state.summoner.kills / 4) +
      Math.floor(this.state.stats.runtime / 60) +
      Math.floor(this.state.stats.reactions / 3) +
      1;
    const soulCrystals = Math.max(1, Math.floor(rewardBase * this.state.soulCrystalMultiplier));
    saveData.soulCrystals += soulCrystals;
    saveData.runs += 1;
    saveData.bestKills = Math.max(saveData.bestKills, this.state.summoner.kills);
    saveData.bestTime = Math.max(saveData.bestTime, Math.floor(this.state.stats.runtime));

    const result: RunResult = {
      kills: this.state.summoner.kills,
      runtime: this.state.stats.runtime,
      reactions: this.state.stats.reactions,
      soulCrystals,
      totalSoulCrystals: saveData.soulCrystals
    };
    this.state.runSettled = true;
    this.state.lastRunResult = result;
    return result;
  }

  public chooseUpgrade(choiceId: string): void {
    const choice = this.state.summoner.upgradeChoices.find((item) => item.id === choiceId);
    if (choice) {
      this.upgradeSystem.applyChoice(this.state, choice);
    }
  }

  public addPetForTest(petId: PetId): void {
    this.upgradeSystem.addPet(this.state, petId);
  }

  public addAllPetsForTest(): void {
    for (const pet of PET_DEFS) {
      this.upgradeSystem.addPet(this.state, pet.id);
    }
  }

  public setSummonerPosition(x: number, y: number): void {
    this.state.summoner.x = Math.min(GAME_WIDTH, Math.max(0, x));
    this.state.summoner.y = Math.min(GAME_HEIGHT, Math.max(0, y));
  }

  public spawnEnemyForTest(x: number, y: number, hp: number): Enemy {
    return this.entities.createEnemy(x, y, hp, BALANCE.enemy.baseSpeed, BALANCE.enemy.xpValue);
  }

  public spawnGemForTest(x: number, y: number, value: number): void {
    this.entities.createGem(x, y, value);
  }

  public countActiveEnemies(): number {
    let count = 0;
    for (const enemy of this.state.enemies) {
      if (enemy.active) {
        count += 1;
      }
    }
    return count;
  }

  public countActiveGems(): number {
    let count = 0;
    for (const gem of this.state.gems) {
      if (gem.active) {
        count += 1;
      }
    }
    return count;
  }

  private rebuildEnemyGrid(): void {
    this.enemyGrid.clear();
    for (const enemy of this.state.enemies) {
      if (enemy.active) {
        this.enemyGrid.insert(enemy.x, enemy.y, enemy);
      }
    }
  }

  private createPet(petId: PetId, id: number, level: number): Pet {
    const definition = getPetDefinition(petId);
    return {
      id,
      definition,
      active: true,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      level,
      range: definition.range,
      damage: definition.damage,
      attackCooldown: definition.cooldown,
      cooldownRemaining: 0,
      targetScanTimer: 0,
      targetScanInterval: definition.targetScanInterval,
      targetId: null
    };
  }
}

function getDefaultBonuses(): GrowthBonuses {
  return {
    maxHpBonus: 0,
    moveSpeedMultiplier: 1,
    xpMultiplier: 1,
    pickupRadiusBonus: 0,
    startingPetLevelBonus: 0,
    reactionDamageMultiplier: 1,
    soulCrystalMultiplier: 1
  };
}
