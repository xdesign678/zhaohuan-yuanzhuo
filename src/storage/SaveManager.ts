import { GROWTH_DEFS, GROWTH_NODE_IDS, type GrowthNodeId } from '../data/GrowthDefs';

export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'summoner-survivor-save-v1';
export const SAVE_TEMP_KEY = `${SAVE_STORAGE_KEY}.tmp`;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type GrowthSave = Record<GrowthNodeId, number>;

export interface SaveData {
  version: typeof SAVE_VERSION;
  soulCrystals: number;
  growth: GrowthSave;
  bestKills: number;
  bestTime: number;
  runs: number;
}

export interface SaveLoadResult {
  readonly data: SaveData;
  readonly usedFallback: boolean;
}

export function createDefaultSave(): SaveData {
  const growth = {} as GrowthSave;
  for (const id of GROWTH_NODE_IDS) {
    growth[id] = 0;
  }

  return {
    version: SAVE_VERSION,
    soulCrystals: 0,
    growth,
    bestKills: 0,
    bestTime: 0,
    runs: 0
  };
}

export class SaveManager {
  private readonly storage: StorageLike | null;

  public constructor(storage: StorageLike | null = resolveLocalStorage()) {
    this.storage = storage;
  }

  public load(): SaveLoadResult {
    if (!this.storage) {
      return { data: createDefaultSave(), usedFallback: true };
    }

    const raw = this.storage.getItem(SAVE_STORAGE_KEY);
    if (!raw) {
      return { data: createDefaultSave(), usedFallback: false };
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      return { data: normalizeSave(parsed), usedFallback: false };
    } catch {
      return { data: createDefaultSave(), usedFallback: true };
    }
  }

  public save(data: SaveData): void {
    if (!this.storage) {
      return;
    }

    const normalized = normalizeSave(data);
    const payload = JSON.stringify(normalized);
    this.storage.setItem(SAVE_TEMP_KEY, payload);
    normalizeSave(JSON.parse(this.storage.getItem(SAVE_TEMP_KEY) ?? '{}'));
    this.storage.setItem(SAVE_STORAGE_KEY, payload);
    this.storage.removeItem(SAVE_TEMP_KEY);
  }
}

function normalizeSave(value: unknown): SaveData {
  if (!isRecord(value)) {
    return createDefaultSave();
  }

  const save = createDefaultSave();
  save.soulCrystals = clampSafeInteger(value.soulCrystals, 0, 999999);
  save.bestKills = clampSafeInteger(value.bestKills, 0, 999999);
  save.bestTime = clampSafeInteger(value.bestTime, 0, 999999);
  save.runs = clampSafeInteger(value.runs, 0, 999999);

  if (isRecord(value.growth)) {
    for (const id of GROWTH_NODE_IDS) {
      save.growth[id] = clampSafeInteger(value.growth[id], 0, GROWTH_DEFS[id].costs.length);
    }
  }

  return save;
}

function clampSafeInteger(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveLocalStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}
