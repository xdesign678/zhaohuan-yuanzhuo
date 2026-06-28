import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import './style.css';

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
    target: 60,
    min: 24
  }
};

const game = new Phaser.Game(config);

if (import.meta.env.DEV) {
  (globalThis as { __ZH_GAME__?: Phaser.Game }).__ZH_GAME__ = game;
}
