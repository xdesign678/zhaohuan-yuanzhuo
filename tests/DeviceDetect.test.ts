import { describe, expect, it } from 'vitest';
import { createPerformanceSettings, detectDeviceTier } from '../src/utils/DeviceDetect';

describe('DeviceDetect', () => {
  it('honors an explicit tier override for verification and settings', () => {
    const settings = createPerformanceSettings({ forcedTier: 'low', hardwareConcurrency: 8, deviceMemory: 8 });

    expect(settings.tier).toBe('low');
    expect(settings.targetFps).toBe(24);
    expect(settings.enemySoftCap).toBe(120);
    expect(settings.enableExtraFx).toBe(false);
  });

  it('classifies constrained mobile devices as low tier', () => {
    expect(
      detectDeviceTier({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        hardwareConcurrency: 2,
        deviceMemory: 1,
        touchPoints: 5
      })
    ).toBe('low');
  });

  it('keeps stronger devices on the 200 enemy performance budget', () => {
    const settings = createPerformanceSettings({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
      hardwareConcurrency: 8,
      deviceMemory: 8,
      touchPoints: 0
    });

    expect(settings.tier).toBe('high');
    expect(settings.targetFps).toBe(60);
    expect(settings.enemySoftCap).toBeGreaterThanOrEqual(200);
    expect(settings.renderPadding).toBeGreaterThan(24);
  });
});
