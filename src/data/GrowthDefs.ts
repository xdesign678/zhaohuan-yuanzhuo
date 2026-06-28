export interface GrowthDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly costs: readonly number[];
}

export const GROWTH_DEFS = {
  vitality: {
    id: 'vitality',
    name: '血烛',
    description: '提高召唤师最大生命',
    costs: [8, 16, 28]
  },
  swiftness: {
    id: 'swiftness',
    name: '疾行符',
    description: '提高移动速度',
    costs: [8, 18, 30]
  },
  wisdom: {
    id: 'wisdom',
    name: '秘典',
    description: '提高经验收益',
    costs: [10, 20, 34]
  },
  magnet: {
    id: 'magnet',
    name: '星磁石',
    description: '扩大经验拾取范围',
    costs: [8, 16, 28]
  },
  bond: {
    id: 'bond',
    name: '兽契',
    description: '起始宠物等级提高',
    costs: [32]
  },
  reaction: {
    id: 'reaction',
    name: '元素炉',
    description: '提高元素反应伤害',
    costs: [12, 24, 40]
  },
  soulHarvest: {
    id: 'soulHarvest',
    name: '魂灯',
    description: '提高结算魂晶收益',
    costs: [12, 24, 40]
  }
} as const satisfies Record<string, GrowthDefinition>;

export type GrowthNodeId = keyof typeof GROWTH_DEFS;

export const GROWTH_NODE_IDS = Object.keys(GROWTH_DEFS) as GrowthNodeId[];
