import { BALANCE } from './Balance';

export interface EnemyDefinition {
  readonly key: string;
  readonly hp: number;
  readonly speed: number;
  readonly radius: number;
  readonly xpValue: number;
}

export const BASIC_ENEMY_DEF: EnemyDefinition = {
  key: 'shade',
  hp: BALANCE.enemy.baseHp,
  speed: BALANCE.enemy.baseSpeed,
  radius: BALANCE.enemy.radius,
  xpValue: BALANCE.enemy.xpValue
};
