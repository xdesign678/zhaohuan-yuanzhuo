export type DeviceTier = 'low' | 'medium' | 'high';

export interface DeviceProbe {
  readonly userAgent?: string;
  readonly hardwareConcurrency?: number;
  readonly deviceMemory?: number;
  readonly touchPoints?: number;
  readonly forcedTier?: DeviceTier;
  readonly reducedMotion?: boolean;
}

export interface PerformanceSettings {
  readonly tier: DeviceTier;
  readonly targetFps: number;
  readonly minFps: number;
  readonly enemySoftCap: number;
  readonly particleLimit: number;
  readonly renderPadding: number;
  readonly enableExtraFx: boolean;
}

export function detectBrowserProbe(): DeviceProbe {
  if (typeof navigator === 'undefined') {
    return {};
  }

  const memoryNavigator = navigator as Navigator & { deviceMemory?: number };
  return {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: memoryNavigator.deviceMemory,
    touchPoints: navigator.maxTouchPoints,
    reducedMotion:
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
  };
}

export function detectDeviceTier(probe: DeviceProbe = detectBrowserProbe()): DeviceTier {
  if (probe.forcedTier) {
    return probe.forcedTier;
  }

  const cores = probe.hardwareConcurrency ?? 4;
  const memory = probe.deviceMemory ?? 4;
  const touchPoints = probe.touchPoints ?? 0;
  const userAgent = probe.userAgent ?? '';
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  if (memory <= 1.5 || cores <= 2 || (isIOS && touchPoints > 0 && cores <= 4 && memory <= 2)) {
    return 'low';
  }

  if (cores >= 8 && memory >= 4 && !probe.reducedMotion) {
    return 'high';
  }

  return 'medium';
}

export function createPerformanceSettings(probe: DeviceProbe = detectBrowserProbe()): PerformanceSettings {
  const tier = detectDeviceTier(probe);

  if (tier === 'low') {
    return {
      tier,
      targetFps: 24,
      minFps: 24,
      enemySoftCap: 120,
      particleLimit: 20,
      renderPadding: 28,
      enableExtraFx: false
    };
  }

  if (tier === 'medium') {
    return {
      tier,
      targetFps: 30,
      minFps: 24,
      enemySoftCap: 180,
      particleLimit: 36,
      renderPadding: 56,
      enableExtraFx: true
    };
  }

  return {
    tier,
    targetFps: 60,
    minFps: 30,
    enemySoftCap: 220,
    particleLimit: 56,
    renderPadding: 84,
    enableExtraFx: true
  };
}
