import { describe, expect, it } from 'vitest';
import { createDefaultSave, SAVE_STORAGE_KEY, SAVE_TEMP_KEY, SAVE_VERSION, SaveManager, type StorageLike } from '../src/storage/SaveManager';

class MemoryStorage implements StorageLike {
  public readonly writes: string[] = [];
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.writes.push(key);
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe('SaveManager', () => {
  it('returns a valid default save when storage is empty', () => {
    const manager = new SaveManager(new MemoryStorage());

    const loaded = manager.load();

    expect(loaded.usedFallback).toBe(false);
    expect(loaded.data).toEqual(createDefaultSave());
    expect(loaded.data.version).toBe(SAVE_VERSION);
  });

  it('falls back to defaults when stored JSON is corrupt', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_STORAGE_KEY, '{broken');
    const manager = new SaveManager(storage);

    const loaded = manager.load();

    expect(loaded.usedFallback).toBe(true);
    expect(loaded.data).toEqual(createDefaultSave());
  });

  it('migrates older saves while preserving safe progress fields', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      SAVE_STORAGE_KEY,
      JSON.stringify({
        version: 0,
        soulCrystals: 37,
        growth: { vitality: 2, reaction: 1, unknown: 9 },
        bestKills: 18,
        bestTime: 91,
        runs: 3
      })
    );
    const manager = new SaveManager(storage);

    const loaded = manager.load();

    expect(loaded.usedFallback).toBe(false);
    expect(loaded.data.version).toBe(SAVE_VERSION);
    expect(loaded.data.soulCrystals).toBe(37);
    expect(loaded.data.growth.vitality).toBe(2);
    expect(loaded.data.growth.reaction).toBe(1);
    expect(loaded.data.bestKills).toBe(18);
    expect(loaded.data.bestTime).toBe(91);
    expect(loaded.data.runs).toBe(3);
    expect(Object.hasOwn(loaded.data.growth, 'unknown')).toBe(false);
  });

  it('saves through a temporary key before committing the main save', () => {
    const storage = new MemoryStorage();
    const manager = new SaveManager(storage);
    const save = createDefaultSave();
    save.soulCrystals = 12;

    manager.save(save);

    expect(storage.writes.slice(0, 2)).toEqual([SAVE_TEMP_KEY, SAVE_STORAGE_KEY]);
    expect(storage.getItem(SAVE_TEMP_KEY)).toBeNull();
    expect(JSON.parse(storage.getItem(SAVE_STORAGE_KEY) ?? '{}')).toMatchObject({
      version: SAVE_VERSION,
      soulCrystals: 12
    });
  });
});
