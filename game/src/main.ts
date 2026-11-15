import Phaser from 'phaser';
import { GameScene } from './render/GameScene';
import { parseSeed, randomSeed } from './sim/rng';

const seed = parseSeed(new URLSearchParams(window.location.search).get('seed')) ?? randomSeed();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#050806',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  banner: false,
  scene: [new GameScene(seed)],
});

// Exposed for the Playwright smoke test and for debugging in the console.
declare global {
  interface Window {
    __recompile?: Phaser.Game;
  }
}
window.__recompile = game;
