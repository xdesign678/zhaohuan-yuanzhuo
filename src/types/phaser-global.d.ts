import type PhaserModule from 'phaser';

declare global {
  const Phaser: typeof PhaserModule;

  interface Window {
    Phaser: typeof PhaserModule;
  }
}

export {};
