import { describe, expect, it } from 'vitest';
import { CFG } from '../src/sim/config';
import { Grid, TILE } from '../src/sim/grid';
import { buildLabSector } from '../src/sim/level';
import { castRay, clearPath, inCone } from '../src/sim/los';
import { moveCircle } from '../src/sim/movement';
import { findPath } from '../src/sim/pathfinding';
import { mulberry32, parseSeed } from '../src/sim/rng';
import { NO_INPUT, World, type Guard, type Input } from '../src/sim/world';

function openGrid(w = 10, h = 10): Grid {
  const g = new Grid(w, h);
  g.fill(1, 1, w - 2, h - 2, TILE.FLOOR);
  return g;
}

/** Takes a guard out of play for the duration of a test. */
function freeze(g: Guard): void {
  g.state = 'stunned';
  g.stunTimer = 999;
}

function run(world: World, seconds: number, input: Input = NO_INPUT): void {
  for (let t = 0; t < seconds; t += 1 / 60) world.step(1 / 60, input);
}

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('only accepts plain integer seeds', () => {
    expect(parseSeed('123')).toBe(123);
    expect(parseSeed('-1')).toBeNull();
    expect(parseSeed('1e9')).toBeNull();
    expect(parseSeed('<script>')).toBeNull();
    expect(parseSeed(null)).toBeNull();
  });
});

describe('line of sight', () => {
  it('is blocked by walls and vents', () => {
    const g = openGrid();
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(true);
    g.set(5, 1, TILE.WALL);
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(false);
    g.set(5, 1, TILE.VENT);
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(false);
  });

  it('casts rays to the first wall', () => {
    const g = openGrid();
    expect(castRay(g, 1.5, 1.5, 0, 20)).toBeCloseTo(7.5);
  });

  it('respects the cone angle and range', () => {
    const g = openGrid();
    const origin = { x: 2.5, y: 5.5 };
    expect(inCone(g, origin, 0, Math.PI / 2, 6, { x: 6.5, y: 5.5 })).toBe(true);
    expect(inCone(g, origin, Math.PI, Math.PI / 2, 6, { x: 6.5, y: 5.5 })).toBe(false);
    expect(inCone(g, origin, 0, Math.PI / 2, 3, { x: 6.5, y: 5.5 })).toBe(false);
  });
});

describe('movement and pathfinding', () => {
  it('stops at walls', () => {
    const g = openGrid();
    const pos = { x: 1.5, y: 1.5 };
    moveCircle(g, pos, -5, 0, 0.3, 'player');
    expect(pos.x).toBeCloseTo(1.3, 1);
  });

  it('lets only the player use vents', () => {
    const g = openGrid();
    g.fill(5, 1, 1, 8, TILE.WALL);
    g.set(5, 4, TILE.VENT);
    expect(findPath(g, { x: 2, y: 4 }, { x: 8, y: 4 }, 'player')).not.toBeNull();
    expect(findPath(g, { x: 2, y: 4 }, { x: 8, y: 4 }, 'guard')).toBeNull();
  });
});

describe('lab sector', () => {
  const level = buildLabSector();
  const g = level.grid;

  it('lets the player reach every terminal, outlet and the exit', () => {
    g.exitOpen = true;
    for (const t of [...level.terminals, ...level.outlets, level.exit]) {
      expect(findPath(g, level.playerStart, t, 'player'), `${t.x},${t.y}`).not.toBeNull();
    }
    g.exitOpen = false;
  });

  it('keeps the exit locked until the security terminal is hacked', () => {
    expect(findPath(g, level.playerStart, level.exit, 'player')).toBeNull();
  });

  it('places every guard waypoint on a reachable floor tile', () => {
    for (const guard of level.guards) {
      for (const wp of guard.route) {
        expect(g.walkable(wp.x, wp.y, 'guard'), `${wp.x},${wp.y}`).toBe(true);
        expect(findPath(g, guard.route[0]!, wp, 'guard')).not.toBeNull();
      }
    }
  });

  it('mounts cameras on walls facing open floor', () => {
    for (const c of level.cameras) {
      expect(g.get(c.x, c.y)).toBe(TILE.WALL);
      const fx = c.x + Math.round(Math.cos(c.facing));
      const fy = c.y + Math.round(Math.sin(c.facing));
      expect(g.get(fx, fy)).toBe(TILE.FLOOR);
    }
  });
});

describe('world rules', () => {
  it('is reproducible for the same seed', () => {
    const a = new World(7);
    const b = new World(7);
    run(a, 3);
    run(b, 3);
    expect(a.guards.map((g) => [g.x, g.y])).toEqual(b.guards.map((g) => [g.x, g.y]));
  });

  it('a guard that keeps seeing the player raises the alarm', () => {
    const w = new World(1);
    const guard = w.guards[0]!;
    // Freeze every other guard far away, put the player right in front of guard 0.
    for (const g of w.guards.slice(1)) freeze(g);
    w.player.x = guard.x + Math.cos(guard.facing) * 2;
    w.player.y = guard.y + Math.sin(guard.facing) * 2;
    if (!w.grid.walkable(Math.floor(w.player.x), Math.floor(w.player.y), 'player')) {
      w.player.x = guard.x + 0.6;
      w.player.y = guard.y;
    }
    run(w, 1.5);
    expect(guard.state).toBe('alert');
    expect(w.stats.detections).toBe(1);
    expect(w.threat).toBeGreaterThan(1);
  });

  it('players inside vents are invisible', () => {
    const w = new World(1);
    const guard = w.guards[1]!; // corridor guard
    for (const g of w.guards) if (g !== guard) freeze(g);
    w.player.x = 10.5;
    w.player.y = 9.5; // corridor crawlspace vent
    guard.x = 10.5;
    guard.y = 10.6;
    guard.facing = -Math.PI / 2;
    run(w, 1);
    expect(guard.seesPlayer).toBe(false);
    expect(guard.state).not.toBe('alert');
  });

  it('static shock stuns a guard in range and costs power', () => {
    const w = new World(3);
    const guard = w.guards[0]!;
    w.player.x = guard.x + 1;
    w.player.y = guard.y;
    if (!w.grid.walkable(Math.floor(w.player.x), Math.floor(w.player.y), 'player')) w.player.x = guard.x - 1;
    const before = w.player.power;
    w.step(1 / 60, { ...NO_INPUT, stun: true });
    expect(guard.state).toBe('stunned');
    expect(w.player.power).toBeLessThan(before - CFG.stun.cost + 0.1);
  });

  it('hacking the security terminal unlocks the exit, and reaching it wins', () => {
    const w = new World(5);
    for (const g of w.guards) freeze(g);
    for (const c of w.cameras) c.disabled = true;
    const sec = w.terminals.find((t) => t.kind === 'security')!;
    w.player.x = sec.x + 0.5;
    w.player.y = sec.y + 1.2;
    run(w, CFG.hack.duration.security + 0.2, { ...NO_INPUT, interact: true });
    expect(sec.hacked).toBe(true);
    expect(w.grid.exitOpen).toBe(true);
    w.player.x = w.level.exit.x - 0.5;
    w.player.y = w.level.exit.y + 0.5;
    run(w, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(w.status).toBe('escaped');
  });

  it('releasing the key interrupts a hack', () => {
    const w = new World(5);
    for (const g of w.guards) freeze(g);
    const t = w.terminals[0]!;
    w.player.x = t.x + 0.5;
    w.player.y = t.y + 1.2;
    run(w, 1, { ...NO_INPUT, interact: true });
    run(w, 0.1);
    expect(w.player.hack).toBeNull();
    expect(t.hacked).toBe(false);
  });

  it('shuts down when power reaches zero', () => {
    const w = new World(9);
    w.player.power = 0.01;
    const guard = w.guards[0]!;
    guard.state = 'alert';
    guard.x = w.player.x + 0.5;
    guard.y = w.player.y;
    guard.facing = Math.PI;
    run(w, 1);
    expect(w.status).toBe('dead');
  });
});
