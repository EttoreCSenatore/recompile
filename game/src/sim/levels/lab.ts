import { Grid, TILE } from '../grid';
import { DOWN, LEFT, type LevelData } from './types';

/**
 * Act 0, sector 0-1: the Halvorsen lab escape (v0.1 DUSTMITE).
 *
 *  A start lab | B server room | C security office      (top row)
 *  ------------------- corridor -------------------
 *  D storage   | E main hall            | F fabricator lobby (bottom row)
 */
export function buildLab(): LevelData {
  const g = new Grid(40, 26);
  const room = (x: number, y: number, w: number, h: number) => g.fill(x, y, w, h, TILE.FLOOR);
  const wall = (x: number, y: number, w: number, h: number) => g.fill(x, y, w, h, TILE.WALL);
  const vent = (x: number, y: number, w: number, h: number) => g.fill(x, y, w, h, TILE.VENT);

  room(1, 1, 11, 8); // A
  room(13, 1, 13, 8); // B
  room(27, 1, 12, 8); // C
  room(1, 10, 38, 2); // corridor
  room(1, 13, 11, 12); // D
  room(13, 13, 18, 12); // E
  room(32, 13, 7, 12); // F

  for (const [x, y] of [
    [5, 9],
    [19, 9],
    [33, 9],
    [6, 12],
    [16, 12],
    [27, 12],
    [35, 12],
    [31, 19],
  ] as const) {
    g.set(x, y, TILE.FLOOR);
  }

  wall(16, 4, 2, 2); // server racks
  wall(21, 4, 2, 2);
  wall(29, 5, 2, 2); // security desk
  wall(16, 16, 3, 1); // lab benches
  wall(22, 16, 3, 1);
  wall(16, 20, 3, 1);
  wall(22, 20, 3, 1);

  vent(7, 9, 9, 1); // crawlspace along the corridor (A, B, corridor)
  vent(29, 9, 3, 1); // into the security office
  vent(12, 22, 1, 2); // D <-> E
  vent(31, 22, 1, 2); // E <-> F

  const exit = { x: 39, y: 18 };
  g.set(exit.x, exit.y, TILE.EXIT);

  return {
    id: 'lab',
    name: 'HALVORSEN LAB // SECTOR 0-1',
    act: 0,
    callSign: 'SEC',
    grid: g,
    playerStart: { x: 4, y: 6 },
    exit,
    securityUnlocks: 'fabricator',
    terminals: [
      { x: 2, y: 2, kind: 'data' },
      { x: 24, y: 2, kind: 'data' },
      { x: 2, y: 24, kind: 'data' },
      { x: 14, y: 24, kind: 'data' },
      { x: 37, y: 2, kind: 'security' },
    ],
    scrapPiles: [
      { x: 9, y: 2 },
      { x: 14, y: 5 },
      { x: 8, y: 22 },
      { x: 26, y: 23 },
      { x: 28, y: 2 },
      { x: 20, y: 14 },
    ],
    outlets: [
      { x: 11, y: 7 },
      { x: 1, y: 18 },
      { x: 38, y: 24 },
    ],
    cameras: [
      { x: 26, y: 9, facing: DOWN, sweep: 1.0, speed: 0.6 },
      { x: 39, y: 4, facing: LEFT, sweep: 0.8, speed: 0.5 },
      { x: 22, y: 12, facing: DOWN, sweep: 1.0, speed: 0.45 },
    ],
    guards: [
      { route: [{ x: 14, y: 2 }, { x: 23, y: 2 }, { x: 23, y: 7 }, { x: 14, y: 7 }] },
      { route: [{ x: 2, y: 10 }, { x: 37, y: 11 }] },
      { route: [{ x: 28, y: 7 }, { x: 36, y: 7 }, { x: 36, y: 3 }] },
      { route: [{ x: 14, y: 14 }, { x: 29, y: 14 }, { x: 29, y: 23 }, { x: 19, y: 23 }] },
      { route: [{ x: 35, y: 16 }], facing: DOWN },
    ],
    caches: [
      { x: 10, y: 24 },
      { x: 38, y: 2 },
    ],
    workbench: { x: 33, y: 15 },
    fabricator: {
      x: 35,
      y: 21,
      spawnPoints: [
        { x: 37, y: 10 },
        { x: 29, y: 18 },
        { x: 21, y: 11 },
      ],
    },
    intro: [
      '> ECHO-7 online. Host: DUSTMITE floor unit. Combat capability: none.',
      '> Gather DATA and SCRAP, hack SECURITY, then COMPILE a new body at the fabricator.',
      '> Guards cannot enter vents. Hold SHIFT to move silently.',
    ],
  };
}
