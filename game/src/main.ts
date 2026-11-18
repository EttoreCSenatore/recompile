import { Game, bootSeed } from './render3d/Game';

const game = new Game(document.getElementById('game')!, bootSeed());

// Exposed for the Playwright smoke test and for debugging in the console.
declare global {
  interface Window {
    __recompile?: () => ReturnType<Game['debug']>;
  }
}
window.__recompile = () => game.debug();
