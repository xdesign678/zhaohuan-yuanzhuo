import { EntityManager } from '../core/EntityManager';
import { SpatialGrid } from '../core/SpatialGrid';
import { BALANCE, GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import { getPetDefinition, PET_DEFS, type PetId } from '../data/PetDefs';
import type { Enemy, GameState, Pet } from '../entities/GameTypes';
import { CombatSystem } from './CombatSystem';
import { ElementSystem } from './ElementSystem';
import { EnemySystem } from './EnemySystem';
import { PetAISystem } from './PetAISystem';
import { SpawnSystem } from './SpawnSystem';
import { UpgradeSystem } from './UpgradeSystem';
import { XPSystem } from './XPSystem';

interface GameSimulationOptions {
  readonly autoSpawn: boolean;
  readonly initialEnemies: number;
  readonly combatEnabled: boolean;
}

export class GameSimulation {
  public readonly state: GameState;

  private readonly entities = new EntityManager();
  private readonly enemyGrid = new SpatialGrid<Enemy>(BALANCE.spatialGrid.cellSize);
  private readonly spawnSystem = new SpawnSystem();
  private readonly enemySystem = new EnemySystem();
  private readonly petSystem = new PetAISystem(this.enemyGrid);
  private readonly elementSystem = new ElementSystem();
  private readonly upgradeSystem = new UpgradeSystem();
  private readonly combatSystem = new CombatSystem(this.elementSystem);
  private readonly xpSystem = new XPSystem(this.upgradeSystem);

  private constructor(private readonly options: GameSimulationOptions) {
    this.state = {
      summoner: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        radius: BALANCE.summoner.radius,
        hp: 100,
        maxHp: 100,
        shield: 0,
        level: 1,
        xp: 0,
        xpToNext: BALANCE.summoner.baseXpToNext,
        pickupRadius: BALANCE.summoner.pickupRadius,
        kills: 0,
        upgradeChoices: [],
        upgradePaused: false
      },
      enemies: this.entities.enemies,
      pets: [this.createPet('saberWolf', 1)],
      gems: this.entities.gems,
      damageEvents: [],
      reactionEvents: [],
      stats: {
        runtime: 0,
        spawned: 0,
        reactions: 0
      },
      reactionDamageMultiplier: 1
    };

    if (options.initialEnemies > 0) {
      this.spawnSystem.spawnStressPack(this.state, this.entities, options.initialEnemies);
    }
  }

  public static create(): GameSimulation {
    return new GameSimulation({
      autoSpawn: true,
      initialEnemies: 0,
      combatEnabled: true
    });
  }

  public static createForPerformanceGate(): GameSimulation {
    return new GameSimulation({
      autoSpawn: true,
      initialEnemies: 200,
      combatEnabled: false
    });
  }

  public static createForTest(): GameSimulation {
    return new GameSimulation({
      autoSpawn: false,
      initialEnemies: 0,
      combatEnabled: true
    });
  }

  public static createForM2Gate(): GameSimulation {
    const simulation = new GameSimulation({
      autoSpawn: false,
      initialEnemies: 0,
      combatEnabled: true
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
      combatEnabled: true
    });
    simulation.spawnGemForTest(simulation.state.summoner.x, simulation.state.summoner.y, BALANCE.summoner.baseXpToNext);
    return simulation;
  }

  public update(deltaSeconds: number): void {
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

    this.enemySystem.update(this.state, deltaSeconds);
    this.elementSystem.update(this.state, deltaSeconds, this.state.stats.runtime);
    this.xpSystem.update(this.state, this.entities, deltaSeconds);
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

  private createPet(petId: PetId, id: number): Pet {
    const definition = getPetDefinition(petId);
    return {
      id,
      definition,
      active: true,
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      level: 1,
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
