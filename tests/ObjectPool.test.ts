import { describe, expect, it } from 'vitest';
import { ObjectPool } from '../src/core/ObjectPool';

interface PooledThing {
  active: boolean;
  value: number;
}

describe('ObjectPool', () => {
  it('reuses released objects instead of allocating new ones', () => {
    let created = 0;
    const pool = new ObjectPool<PooledThing>(
      () => {
        created += 1;
        return { active: false, value: 0 };
      },
      (item) => {
        item.active = true;
      },
      (item) => {
        item.active = false;
        item.value = 0;
      }
    );

    const first = pool.acquire();
    first.value = 42;
    pool.release(first);
    const second = pool.acquire();

    expect(second).toBe(first);
    expect(second).toEqual({ active: true, value: 0 });
    expect(created).toBe(1);
  });
});
