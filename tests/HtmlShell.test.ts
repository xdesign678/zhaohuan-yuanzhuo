import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('HTML shell boot safety', () => {
  it('loads Phaser before the Vite module and keeps a visible boot fallback', () => {
    const html = readFileSync('index.html', 'utf8');
    const phaserIndex = html.indexOf('vendor/phaser.min.js');
    const mainIndex = html.indexOf('/src/main.ts');

    expect(phaserIndex).toBeGreaterThan(-1);
    expect(mainIndex).toBeGreaterThan(-1);
    expect(phaserIndex).toBeLessThan(mainIndex);
    expect(html).toContain('id="boot-fallback"');
  });
});
