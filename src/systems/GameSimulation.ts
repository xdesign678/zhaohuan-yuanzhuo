import { EntityManager } from '../core/EntityManager';
import { SpatialGrid } from '../core/SpatialGrid';
import { BALANCE, GAME_HEIGHT, GAME_WIDTH } from '../data/Balance';
import type { Enemy, GameState } from '../entities/GameTypes';
import { CombatSystem } from './CombatSystem';
import { EnemySystem } from './EnemySystem';
import { PetAISystem } from './PetAISystem';
import { SpawnSystem } from './SpawnSystem';
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
  private readonly combatSystem = new CombatSystem();
  private readonly xpSystem = new XPSystem();

  private constructor(private readonly options: GameSimulationOptions) {
    this.state = {
      summoner: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        radius: BALANCE.summoner.radius,
        hp: 100,
        maxHp: 100,
        level: 1,
        xp: 0,
        xpToNext: BALANCE.summoner.baseXpToNext,
        pickupRadius: BALANCE.summoner.pickupRadius,
        kills: 0
      },
      enemies: this.entities.enemies,
      pets: [
        {
          id: 1,
          active: true,
          x: GAME_WIDTH / 2 + 34,
          y: GAME_HEIGHT / 2 - 28,
          level: 1,
          range: BALANCE.pet.range,
          damage: BALANCE.pet.damage,
          attackCooldown: BALANCE.pet.attackCooldown,
          cooldownRemaining: 0,
          targetScanTimer: 0,
          targetScanInterval: BALANCE.pet.targetScanInterval,
          targetId: null
        }
      ],
      gems: this.entities.gems,
      damageEvents: [],
      stats: {
        runtime: 0,
        spawned: 0
      }
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

  public update(deltaSeconds: number): void {
    this.state.stats.runtime += deltaSeconds;

    if (this.options.autoSpawn) {
      this.spawnSystem.update(this.state, this.entities, deltaSeconds);
    }

    this.rebuildEnemyGrid();

    if (this.options.combatEnabled) {
      this.petSystem.update(this.state, deltaSeconds);
      this.combatSystem.update(this.state, this.entities, deltaSeconds);
    }

    this.enemySystem.update(this.state, deltaSeconds);
    this.xpSystem.update(this.state, this.entities, deltaSeconds);
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
}
