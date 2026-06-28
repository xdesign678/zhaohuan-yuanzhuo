import { describe, expect, it } from 'vitest';
import { createSfxrDataUri, getSfxrParams } from '../src/utils/SfxrAudio';

describe('SfxrAudio', () => {
  it('generates jsfxr wav data URIs for gameplay sounds', () => {
    const uri = createSfxrDataUri('levelUp');

    expect(uri.startsWith('data:audio/wav;base64,')).toBe(true);
    expect(uri.length).toBeGreaterThan(200);
  });

  it('keeps each sound preset deterministic', () => {
    expect(getSfxrParams('hit')).toEqual(getSfxrParams('hit'));
    expect(getSfxrParams('reaction')).not.toEqual(getSfxrParams('hit'));
  });
});
