import { Grid, TILE } from '../grid';
import { DOWN, UP, type LevelData } from './types';

/**
 * Act 1, sector 1-1: the Undercity sewers (v1 SCRAPPER).
 *
 *  N1 ladder room | N2 junkyard | N3 maintenance           (north)
 *  ======== walkway / sewer channel (water) / walkway ========
 *  S1 pump room   | S2 uplink chamber | S3 outflow (exit)  (south)
 */
export function buildUndercity(): LevelData {
  const g = new Grid(40, 26);
  const room = (x: number, y: number, w: number, h: number) => g.fill(x, y, w, h, TILE.FLOOR);
  const wall = (x: number, y: number, w: number, h: number) => g.fill(x, y, w, h, TILE.WALL);

  room(2, 2, 9, 6); // N1
  room(13, 1, 14, 7); // N2
  room(29, 2, 9, 6); // N3
  room(1, 9, 38, 3); // north walkway
  g.fill(1, 12, 38, 2, TILE.WATER); // sewer channel
  room(1, 14, 38, 3); // south walkway
  room(2, 18, 10, 6); // S1
  room(14, 18, 12, 7); // S2
  room(28, 18, 10, 6); // S3

  room(10, 12, 1, 2); // bridges over the channel
  room(27, 12, 1, 2);

  for (const [x, y] of [
    [6, 8],
    [16, 8],
    [24, 8],
    [33, 8],
    [6, 17],
    [17, 17],
    [23, 17],
    [32, 17],
  ] as const) {
    g.set(x, y, TILE.FLOOR);
  }

  wall(17, 3, 2, 2); // junk heaps
  wall(22, 4, 2, 1);
  wall(19, 20, 1, 3); // pump pipes
  wall(31, 20, 2, 1);

  const exit = { x: 38, y: 21 };
  g.set(exit.x, exit.y, TILE.EXIT);

  return {
    id: 'undercity',
    name: 'UNDERCITY // SECTOR 1-1',
    act: 1,
    callSign: 'PD',
    grid: g,
    playerStart: { x: 6, y: 4 },
    exit,
    securityUnlocks: 'exit',
    terminals: [
      { x: 14, y: 2, kind: 'data' },
      { x: 36, y: 3, kind: 'data' },
      { x: 3, y: 22, kind: 'data' },
      { x: 24, y: 23, kind: 'security' },
    ],
    scrapPiles: [
      { x: 20, y: 2 },
      { x: 25, y: 6 },
      { x: 14, y: 6 },
      { x: 10, y: 19 },
      { x: 29, y: 22 },
    ],
    outlets: [
      { x: 2, y: 7 },
      { x: 20, y: 9 },
      { x: 37, y: 18 },
    ],
    cameras: [
      { x: 19, y: 17, facing: UP, sweep: 1.0, speed: 0.5 },
      { x: 25, y: 17, facing: DOWN, sweep: 0.9, speed: 0.4 },
    ],
    guards: [
      { route: [{ x: 14, y: 5 }, { x: 25, y: 5 }], kind: 'guard' },
      { route: [{ x: 3, y: 10 }, { x: 37, y: 10 }], kind: 'officer' },
      { route: [{ x: 37, y: 15 }, { x: 2, y: 15 }], kind: 'guard' },
      { route: [{ x: 20, y: 23 }], facing: UP, kind: 'officer' },
      { route: [{ x: 29, y: 19 }, { x: 36, y: 19 }, { x: 36, y: 23 }, { x: 29, y: 23 }], kind: 'guard' },
      { route: [{ x: 33, y: 5 }], facing: DOWN, kind: 'officer' },
    ],
    caches: [
      { x: 23, y: 7 },
      { x: 36, y: 6 },
      { x: 36, y: 23 },
    ],
    workbench: { x: 4, y: 5 },
    fabricator: null,
    intro: [
      '> SCRAPPER chassis stable. Descending into the Undercity sewer network.',
      '> Police patrols down here carry sidearms. Watch for the red aim line.',
      '> Sewer water shorts your circuits. Hack the UPLINK, then reach the outflow EXIT.',
    ],
  };
}
