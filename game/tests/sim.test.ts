import { describe, expect, it } from 'vitest';
import { CFG } from '../src/sim/config';
import { Grid, TILE, type Mover, type Vec } from '../src/sim/grid';
import { buildLevel, LEVEL_ORDER } from '../src/sim/levels';
import { castRay, clearPath, inCone } from '../src/sim/los';
import { moveCircle } from '../src/sim/movement';
import { findPath } from '../src/sim/pathfinding';
import { mulberry32, parseSeed } from '../src/sim/rng';
import { VERSIONS } from '../src/sim/versions';
import { center, dist, NO_INPUT, World, type Guard, type Input } from '../src/sim/world';

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

function quiet(w: World): void {
  for (const g of w.guards) freeze(g);
  for (const c of w.cameras) c.disabled = true;
}

function run(world: World, seconds: number, input: Input | ((w: World) => Input) = NO_INPUT): void {
  for (let t = 0; t < seconds && world.status === 'playing'; t += 1 / 60) {
    world.step(1 / 60, typeof input === 'function' ? input(world) : input);
  }
}

function logs(w: World): string[] {
  return w.drainEvents().flatMap((e) => (e.type === 'log' ? [e.text] : []));
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
  it('is blocked by walls and vents but not water', () => {
    const g = openGrid();
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(true);
    g.set(5, 1, TILE.WATER);
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(true);
    g.set(5, 1, TILE.WALL);
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(false);
    g.set(5, 1, TILE.VENT);
    expect(clearPath(g, 1.5, 1.5, 8.5, 1.5)).toBe(false);
  });

  it('casts rays to the first wall', () => {
    expect(castRay(openGrid(), 1.5, 1.5, 0, 20)).toBeCloseTo(7.5);
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
  it('slides flush against walls', () => {
    const pos = { x: 1.5, y: 1.5 };
    moveCircle(openGrid(), pos, -5, 0, 0.3, 'player');
    expect(pos.x).toBeCloseTo(1.3, 1);
  });

  it('lets only the small v0.1 body use vents', () => {
    const g = openGrid();
    g.fill(5, 1, 1, 8, TILE.WALL);
    g.set(5, 4, TILE.VENT);
    const route = (m: Mover) => findPath(g, { x: 2, y: 4 }, { x: 8, y: 4 }, m);
    expect(route('player')).not.toBeNull();
    expect(route('large')).toBeNull();
    expect(route('guard')).toBeNull();
  });
});

describe.each(LEVEL_ORDER)('level %s', (id) => {
  const level = buildLevel(id);
  const g = level.grid;
  const mover: Mover = id === 'lab' ? 'player' : 'large';

  it('lets ECHO reach every terminal, scrap pile, outlet and the exit', () => {
    g.exitOpen = true;
    const spots: Vec[] = [...level.terminals, ...level.scrapPiles, ...level.outlets, level.exit];
    if (level.fabricator) spots.push(level.fabricator);
    for (const t of spots) expect(findPath(g, level.playerStart, t, mover), `${t.x},${t.y}`).not.toBeNull();
    g.exitOpen = false;
  });

  it('starts with the exit locked', () => {
    expect(findPath(g, level.playerStart, level.exit, mover)).toBeNull();
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
      expect(g.walkable(fx, fy, 'guard')).toBe(true);
    }
  });

  it('lets siege reinforcements reach the fabricator', () => {
    for (const sp of level.fabricator?.spawnPoints ?? []) {
      expect(findPath(g, sp, level.fabricator!, 'guard')).not.toBeNull();
    }
  });
});

describe('lab economy', () => {
  it('offers enough DATA and SCRAP to afford the first Compile', () => {
    const lab = buildLevel('lab');
    const r = CFG.interact.reward;
    const data =
      lab.terminals.reduce((s, t) => s + r[t.kind], 0) + lab.cameras.length * r.camera;
    const scrap = lab.scrapPiles.length * r.scrap;
    const cost = VERSIONS['v0.1'].next!;
    expect(data).toBeGreaterThanOrEqual(cost.data + 10);
    expect(scrap).toBeGreaterThanOrEqual(cost.scrap + 8);
  });
});

describe('stealth (v0.1 DUSTMITE)', () => {
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
    for (const g of w.guards.slice(1)) freeze(g);
    w.player.x = guard.x + 0.6;
    w.player.y = guard.y;
    run(w, 1.5);
    expect(guard.state).toBe('alert');
    expect(w.stats.detections).toBe(1);
    expect(w.threat).toBeGreaterThan(1);
  });

  it('players inside vents are invisible', () => {
    const w = new World(1);
    const guard = w.guards[1]!; // corridor guard
    for (const g of w.guards) if (g !== guard) freeze(g);
    Object.assign(w.player, { x: 10.5, y: 9.5 }); // corridor crawlspace
    Object.assign(guard, { x: 10.5, y: 10.6, facing: -Math.PI / 2 });
    run(w, 1);
    expect(guard.seesPlayer).toBe(false);
    expect(guard.state).not.toBe('alert');
  });

  it('static shock stuns a guard in range and costs power', () => {
    const w = new World(3);
    const guard = w.guards[0]!;
    Object.assign(w.player, { x: guard.x + 1, y: guard.y });
    if (!w.grid.walkable(Math.floor(w.player.x), Math.floor(w.player.y), 'player')) w.player.x = guard.x - 1;
    const before = w.player.power;
    w.step(1 / 60, { ...NO_INPUT, ability: true });
    expect(guard.state).toBe('stunned');
    expect(w.player.power).toBeLessThan(before - VERSIONS['v0.1'].ability.cost + 0.1);
  });

  it('releasing the key interrupts a hack', () => {
    const w = new World(5);
    quiet(w);
    const t = w.terminals[0]!;
    Object.assign(w.player, { x: t.x + 0.5, y: t.y + 1.2 });
    run(w, 1, { ...NO_INPUT, interact: true });
    run(w, 0.1);
    expect(w.player.interact).toBeNull();
    expect(t.hacked).toBe(false);
  });

  it('scavenging a scrap pile gives SCRAP', () => {
    const w = new World(5);
    quiet(w);
    const s = w.scrapPiles[0]!;
    Object.assign(w.player, center(s));
    run(w, CFG.interact.duration.scrap + 0.1, { ...NO_INPUT, interact: true });
    expect(s.taken).toBe(true);
    expect(w.player.scrap).toBe(CFG.interact.reward.scrap);
  });

  it('shuts down when power reaches zero', () => {
    const w = new World(9);
    w.player.power = 0.01;
    const guard = w.guards[0]!;
    Object.assign(guard, { state: 'alert', x: w.player.x + 0.5, y: w.player.y, facing: Math.PI });
    run(w, 1);
    expect(w.status).toBe('dead');
  });
});

describe('the Compile (v0.1 → v1)', () => {
  function readyToCompile(seed = 11): World {
    const w = new World(seed);
    quiet(w);
    w.player.data = 50;
    w.player.scrap = 40;
    const sec = w.terminals.find((t) => t.kind === 'security')!;
    Object.assign(w.player, { x: sec.x + 0.5, y: sec.y + 1.2 });
    run(w, CFG.interact.duration.security + 0.2, { ...NO_INPUT, interact: true });
    run(w, 0.05); // release the key
    return w;
  }

  function startCompileAt(w: World): void {
    Object.assign(w.player, center(w.fabricator!));
    run(w, CFG.interact.duration.fabricator + 0.1, { ...NO_INPUT, interact: true });
    run(w, 0.05);
  }

  it('hacking SECURITY powers the fabricator but keeps the exit locked', () => {
    const w = readyToCompile();
    expect(w.fabricator!.state).toBe('ready');
    expect(w.grid.exitOpen).toBe(false);
  });

  it('cannot start without enough DATA and SCRAP', () => {
    const w = readyToCompile();
    w.player.scrap = 5;
    startCompileAt(w);
    expect(w.fabricator!.state).toBe('ready');
  });

  it('fails if ECHO does not defend the fabricator', () => {
    const w = readyToCompile();
    startCompileAt(w);
    expect(w.fabricator!.state).toBe('compiling');
    const data = w.player.data;
    Object.assign(w.player, center(w.level.playerStart)); // walk away and hide
    w.drainEvents();
    run(w, CFG.compile.duration);
    expect(logs(w).some((l) => l.includes('COMPILE FAILED'))).toBe(true);
    expect(w.player.version.id).toBe('v0.1');
    expect(w.player.data).toBe(data); // resources are only spent on success
  });

  it('succeeds when ECHO keeps stunning attackers, and boots SCRAPPER', () => {
    const w = readyToCompile();
    const data = w.player.data;
    startCompileAt(w);
    // A sensible defender: recharge at the lobby outlet, and only spend a stun on
    // attackers that are actually hitting the fabricator.
    const outlet = center(w.outlets.find((o) => o.x === 38 && o.y === 24)!);
    const bot = (world: World): Input => {
      const p = world.player;
      const fab = center(world.fabricator!);
      const t = world.guards
        .filter((g) => g.siege && g.state === 'alert' && dist(g, fab) <= CFG.compile.attackRange + 0.5)
        .sort((a, b) => dist(a, p) - dist(b, p))[0];
      let goal: Vec = outlet;
      let ability = false;
      if (t && p.power >= 16) {
        goal = t;
        ability = dist(p, t) <= CFG.stun.range - 0.2 && p.abilityCooldown <= 0;
      }
      const dx = goal.x - p.x;
      const dy = goal.y - p.y;
      const d = Math.hypot(dx, dy);
      return { ...NO_INPUT, moveX: d > 0.3 ? dx / d : 0, moveY: d > 0.3 ? dy / d : 0, ability };
    };
    run(w, CFG.compile.duration + 1, bot);
    expect(w.status).toBe('playing');
    expect(w.fabricator!.state).toBe('done');
    expect(w.player.version.id).toBe('v1');
    expect(w.player.power).toBeGreaterThan(VERSIONS.v1.maxPower * 0.9);
    expect(w.player.data).toBe(data - VERSIONS['v0.1'].next!.data);
    expect(w.grid.exitOpen).toBe(true);
    expect(w.stats.compiles).toBe(1);
  });
});

describe('combat (v1 SCRAPPER)', () => {
  it('claws take down a guard in three hits and salvage SCRAP', () => {
    const w = new World(2, { version: 'v1' });
    const guard = w.guards[0]!;
    for (const g of w.guards.slice(1)) freeze(g);
    Object.assign(w.player, { x: guard.x - 0.9, y: guard.y });
    const aim = { x: guard.x, y: guard.y };
    run(w, 1.2, { ...NO_INPUT, attack: true, aim });
    expect(guard.state).toBe('down');
    expect(w.stats.kills).toBe(1);
    expect(w.player.scrap).toBe(CFG.guard.salvage);
  });

  it('pounce leaps forward and lands a hit', () => {
    const w = new World(4, { version: 'v1' });
    quiet(w);
    const guard = w.guards[2]!; // corridor guard
    Object.assign(guard, { x: 24.5, y: 10.5, state: 'patrol', stunTimer: 0 });
    Object.assign(w.player, { x: 21.5, y: 10.5 });
    w.step(1 / 60, { ...NO_INPUT, aim: { x: 30, y: 10.5 }, ability: true });
    run(w, 0.4);
    expect(w.player.x).toBeGreaterThan(23.5);
    expect(guard.hp).toBeLessThan(guard.maxHp);
  });

  it('is too large for vents', () => {
    const w = new World(4, { version: 'v1' });
    quiet(w);
    Object.assign(w.player, { x: 10.5, y: 10.5 });
    run(w, 1, { ...NO_INPUT, moveY: -1 }); // the crawlspace is right above
    expect(w.player.inVent).toBe(false);
    expect(w.player.y).toBeGreaterThan(9.9);
  });
});

describe('the Undercity (act 1)', () => {
  it('carries version and resources over from the lab', () => {
    const w = new World(8, { version: 'v1' });
    quiet(w);
    w.player.data = 17;
    w.player.scrap = 9;
    w.grid.exitOpen = true;
    Object.assign(w.player, { x: w.level.exit.x - 0.5, y: w.level.exit.y + 0.5 });
    run(w, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(w.level.id).toBe('undercity');
    expect(w.player.version.id).toBe('v1');
    expect([w.player.data, w.player.scrap]).toEqual([17, 9]);
  });

  it('police officers telegraph and fire shots that drain Power', () => {
    const w = new World(8, { version: 'v1', startLevel: 'undercity' });
    const officer = w.guards.find((g) => g.kind === 'officer')!;
    for (const g of w.guards) if (g !== officer) freeze(g);
    for (const c of w.cameras) c.disabled = true;
    Object.assign(officer, { x: 10.5, y: 10.5, facing: 0, state: 'alert', suspicion: 1 });
    Object.assign(w.player, { x: 14.5, y: 10.5 });
    const shots: number[] = [];
    let aimed = false;
    for (let i = 0; i < 120; i++) {
      w.step(1 / 60, NO_INPUT);
      if (officer.aimTimer >= 0) aimed = true;
      for (const e of w.drainEvents()) if (e.type === 'shot') shots.push(i);
    }
    expect(aimed).toBe(true);
    expect(shots.length).toBeGreaterThan(0);
    expect(w.player.power).toBeLessThan(VERSIONS.v1.maxPower);
  });

  it('sewer water drains Power', () => {
    const w = new World(8, { version: 'v1', startLevel: 'undercity' });
    quiet(w);
    Object.assign(w.player, { x: 5.5, y: 12.5 });
    run(w, 2);
    expect(w.player.inWater).toBe(true);
    expect(w.player.power).toBeLessThan(VERSIONS.v1.maxPower - CFG.water.drain);
  });

  it('the UPLINK opens the outflow, and reaching it ends the run', () => {
    const w = new World(8, { version: 'v1', startLevel: 'undercity' });
    quiet(w);
    const up = w.terminals.find((t) => t.kind === 'security')!;
    Object.assign(w.player, { x: up.x + 0.5, y: up.y - 0.7 });
    run(w, CFG.interact.duration.security + 0.2, { ...NO_INPUT, interact: true });
    expect(w.grid.exitOpen).toBe(true);
    Object.assign(w.player, { x: w.level.exit.x - 0.5, y: w.level.exit.y + 0.5 });
    run(w, 0.5, { ...NO_INPUT, moveX: 1 });
    expect(w.status).toBe('escaped');
  });
});
