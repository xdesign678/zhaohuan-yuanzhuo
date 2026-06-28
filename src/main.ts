import { GameScene } from './scenes/GameScene';
import './style.css';
import { createPerformanceSettings, detectBrowserProbe, type DeviceTier } from './utils/DeviceDetect';
import { registerServiceWorker } from './utils/ServiceWorkerRegistration';

const params = new URLSearchParams(window.location.search);
const forcedTier: DeviceTier | undefined = params.get('m5low') === '1' ? 'low' : undefined;
const performanceSettings = createPerformanceSettings(forcedTier ? { ...detectBrowserProbe(), forcedTier } : detectBrowserProbe());

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-root',
  backgroundColor: '#09080d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 360,
    height: 640
  },
  scene: [GameScene],
  fps: {
    target: performanceSettings.targetFps,
    min: performanceSettings.minFps
  }
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  (globalThis as { __ZH_GAME__?: Phaser.Game }).__ZH_GAME__ = game;
}

registerServiceWorker(import.meta.env.BASE_URL, import.meta.env.PROD);
