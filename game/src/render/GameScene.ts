import Phaser from 'phaser';
import { CFG } from '../sim/config';
import { TILE } from '../sim/grid';
import { castRay } from '../sim/los';
import { randomSeed } from '../sim/rng';
import { NO_INPUT, World, type Guard, type GuardState, type Input } from '../sim/world';
import { Hud } from './hud';

const T = 16; // pixels per tile
const STEP = 1 / 60; // fixed simulation step
const CONE_RAYS = 28;

const COLORS = {
  floor: 0x17261d,
  floorEdge: 0x1d3125,
  wall: 0x34463b,
  wallEdge: 0x56705f,
  vent: 0x122633,
  ventGrate: 0x3f7088,
  player: 0x39ff6a,
  outlet: 0xffd447,
  dataScreen: 0x39ffd0,
  secScreen: 0xffb000,
  deadScreen: 0x2a2f2c,
  terminalBody: 0x2b3a33,
  camBody: 0x8899aa,
  red: 0xff3b3b,
  green: 0x39ff6a,
  blue: 0x6aa8ff,
};

const GUARD_CONE: Record<GuardState, [number, number]> = {
  patrol: [0xfff1a8, 0.12],
  suspicious: [0xffb000, 0.2],
  investigate: [0xffb000, 0.15],
  alert: [0xff3b3b, 0.22],
  stunned: [0x6aa8ff, 0],
};

type Mode = 'title' | 'playing' | 'paused' | 'over';

interface Ripple {
  x: number;
  y: number;
  r: number;
  t: number;
  color: number;
}

type Keys = Record<
  'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SHIFT' | 'F' | 'Q' | 'ESC' | 'ENTER' | 'R',
  Phaser.Input.Keyboard.Key
>;

export class GameScene extends Phaser.Scene {
  private world!: World;
  private hud = new Hud();
  private mode: Mode = 'title';
  private keys!: Keys;
  private acc = 0;
  /** One-shot key presses, captured from keydown events so quick taps are never lost between frames. */
  private pressed = new Set<string>();
  private mapGfx!: Phaser.GameObjects.Graphics;
  private dynGfx!: Phaser.GameObjects.Graphics;
  private fogGfx!: Phaser.GameObjects.Graphics;
  private topGfx!: Phaser.GameObjects.Graphics;
  private follow = { x: 0, y: 0 };
  private lastVis: Uint8Array | null = null;
  private ripples: Ripple[] = [];

  constructor(private readonly initialSeed: number) {
    super('game');
  }

  create(): void {
    this.keys = this.input.keyboard!.addKeys(
      'W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,F,Q,ESC,ENTER,R',
      true,
    ) as Keys;
    for (const code of ['ENTER', 'ESC', 'R', 'Q']) {
      this.input.keyboard!.on(`keydown-${code}`, (e: KeyboardEvent) => {
        if (!e.repeat) this.pressed.add(code);
      });
    }
    this.mapGfx = this.add.graphics().setDepth(0);
    this.dynGfx = this.add.graphics().setDepth(1);
    this.fogGfx = this.add.graphics().setDepth(2);
    this.topGfx = this.add.graphics().setDepth(3);

    const cam = this.cameras.main;
    cam.setZoom(2);
    cam.setBackgroundColor('#050806');
    cam.startFollow(this.follow, true, 0.15, 0.15);

    this.game.events.on(Phaser.Core.Events.BLUR, () => {
      if (this.mode === 'playing') this.setMode('paused');
    });

    this.newRun(this.initialSeed);
    this.setMode('title');
  }

  private newRun(seed: number): void {
    this.world = new World(seed);
    this.hud.reset(seed);
    this.acc = 0;
    this.ripples = [];
    this.lastVis = null;
    const g = this.world.grid;
    this.cameras.main.setBounds(0, 0, g.width * T, g.height * T);
    this.follow.x = this.world.player.x * T;
    this.follow.y = this.world.player.y * T;
    this.cameras.main.centerOn(this.follow.x, this.follow.y);
    this.drawMap();
    this.flushEvents();
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(seed));
    window.history.replaceState(null, '', url);
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.hud.setVisible(mode === 'playing' || mode === 'paused');
    if (mode === 'title') this.hud.showTitle(this.world.seed);
    else if (mode === 'paused') this.hud.showPause();
    else if (mode === 'over') this.hud.showEnd(this.world);
    else this.hud.hideOverlay();
  }

  update(_time: number, deltaMs: number): void {
    const enter = this.pressed.delete('ENTER');
    const esc = this.pressed.delete('ESC');
    const r = this.pressed.delete('R');

    switch (this.mode) {
      case 'title':
        if (enter) this.setMode('playing');
        break;
      case 'paused':
        if (esc || enter) this.setMode('playing');
        else if (r) {
          this.newRun(this.world.seed);
          this.setMode('playing');
        }
        break;
      case 'over':
        if (enter) {
          this.newRun(randomSeed());
          this.setMode('playing');
        } else if (r) {
          this.newRun(this.world.seed);
          this.setMode('playing');
        }
        break;
      case 'playing':
        if (esc) {
          this.setMode('paused');
          break;
        }
        this.simulate(Math.min(deltaMs / 1000, 0.1));
        break;
    }
    // Q stays queued until a simulation step consumes it; discard it outside gameplay.
    if (this.mode !== 'playing') this.pressed.delete('Q');

    this.updateRipples(deltaMs / 1000);
    this.render();
    this.hud.update(this.world);
  }

  private simulate(dt: number): void {
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      this.world.step(STEP, this.readInput());
      if (this.world.status !== 'playing') break;
    }
    this.flushEvents();
    if (this.world.status !== 'playing') this.setMode('over');
    const p = this.world.player;
    this.follow.x = p.x * T;
    this.follow.y = p.y * T;
  }

  private readInput(): Input {
    const k = this.keys;
    const x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    return { ...NO_INPUT, moveX: x, moveY: y, sneak: k.SHIFT.isDown, interact: k.F.isDown, stun: this.pressed.delete('Q') };
  }

  private flushEvents(): void {
    for (const e of this.world.drainEvents()) {
      switch (e.type) {
        case 'log':
          this.hud.log(e.text, e.level);
          break;
        case 'noise':
          this.ripples.push({ x: e.x, y: e.y, r: e.r, t: 0, color: COLORS.green });
          break;
        case 'stun':
          this.ripples.push({ x: e.x, y: e.y, r: 1.2, t: 0, color: COLORS.blue });
          break;
        case 'zap':
          this.ripples.push({ x: e.x, y: e.y, r: 0.8, t: 0, color: COLORS.red });
          break;
      }
    }
  }

  private updateRipples(dt: number): void {
    for (const r of this.ripples) r.t += dt;
    this.ripples = this.ripples.filter((r) => r.t < 0.6);
  }

  // ── Drawing ─────────────────────────────────────────────────────────────

  private drawMap(): void {
    const g = this.world.grid;
    const m = this.mapGfx;
    m.clear();
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const t = g.get(x, y);
        const px = x * T;
        const py = y * T;
        if (t === TILE.FLOOR) {
          m.fillStyle(COLORS.floorEdge).fillRect(px, py, T, T);
          m.fillStyle(COLORS.floor).fillRect(px + 1, py + 1, T - 1, T - 1);
        } else if (t === TILE.VENT) {
          m.fillStyle(COLORS.vent).fillRect(px, py, T, T);
          m.fillStyle(COLORS.ventGrate);
          for (let i = 3; i < T; i += 4) m.fillRect(px + 2, py + i, T - 4, 1);
        } else if (t === TILE.WALL) {
          m.fillStyle(COLORS.wallEdge).fillRect(px, py, T, T);
          m.fillStyle(COLORS.wall).fillRect(px + 1, py + 1, T - 2, T - 2);
        }
      }
    }
  }

  private render(): void {
    const w = this.world;
    const d = this.dynGfx;
    d.clear();

    // Exit door.
    const ex = w.level.exit.x * T;
    const ey = w.level.exit.y * T;
    if (w.grid.exitOpen) {
      const pulse = 0.6 + 0.4 * Math.sin(this.time.now / 200);
      d.fillStyle(COLORS.green, pulse).fillRect(ex, ey, T, T);
    } else {
      d.fillStyle(0x5a1414).fillRect(ex, ey, T, T);
      d.lineStyle(1, COLORS.red).lineBetween(ex + 3, ey + 3, ex + T - 3, ey + T - 3);
      d.lineBetween(ex + T - 3, ey + 3, ex + 3, ey + T - 3);
    }

    for (const o of w.outlets) {
      d.fillStyle(COLORS.outlet, w.player.charging ? 1 : 0.7).fillRect(o.x * T + 6, o.y * T + 5, 4, 6);
    }

    for (const t of w.terminals) {
      const px = t.x * T;
      const py = t.y * T;
      d.fillStyle(COLORS.terminalBody).fillRect(px + 2, py + 3, 12, 10);
      const screen = t.hacked ? COLORS.deadScreen : t.kind === 'security' ? COLORS.secScreen : COLORS.dataScreen;
      d.fillStyle(screen).fillRect(px + 4, py + 5, 8, 5);
    }

    // Vision cones (drawn under the fog: light leaks into explored areas, as flashlights would).
    for (const c of w.cameras) {
      if (c.disabled || c.cooldown > 0) continue;
      this.drawCone(c.x, c.y, c.facing, CFG.camera.fov, CFG.camera.range, c.seesPlayer ? COLORS.red : 0x8fd3ff, c.seesPlayer ? 0.22 : 0.1);
    }
    for (const g of w.guards) {
      const [color, alpha] = GUARD_CONE[g.state];
      if (alpha > 0) this.drawCone(g.x, g.y, g.facing, CFG.guard.fov, CFG.guard.range, color, alpha);
    }

    for (const c of w.cameras) {
      const px = c.mountX * T + T / 2 + Math.cos(c.baseFacing) * 5;
      const py = c.mountY * T + T / 2 + Math.sin(c.baseFacing) * 5;
      d.fillStyle(COLORS.camBody).fillRect(px - 3, py - 3, 6, 6);
      d.fillStyle(c.disabled ? 0x333333 : c.seesPlayer ? COLORS.red : 0xff7777).fillRect(px - 1, py - 1, 2, 2);
    }

    for (const g of w.guards) {
      if (!w.visible[w.grid.index(Math.floor(g.x), Math.floor(g.y))]) continue;
      this.drawGuard(g);
    }

    this.drawFog();
    this.drawTop();
  }

  private drawCone(x: number, y: number, facing: number, fov: number, range: number, color: number, alpha: number): void {
    const d = this.dynGfx;
    d.fillStyle(color, alpha);
    d.beginPath();
    d.moveTo(x * T, y * T);
    for (let i = 0; i <= CONE_RAYS; i++) {
      const a = facing - fov / 2 + (fov * i) / CONE_RAYS;
      const len = castRay(this.world.grid, x, y, a, range);
      d.lineTo((x + Math.cos(a) * len) * T, (y + Math.sin(a) * len) * T);
    }
    d.closePath();
    d.fillPath();
  }

  private drawGuard(g: Guard): void {
    const d = this.dynGfx;
    const px = g.x * T;
    const py = g.y * T;
    const body = g.state === 'stunned' ? COLORS.blue : g.state === 'alert' ? COLORS.red : 0xe08a4a;
    d.fillStyle(0x000000, 0.4).fillCircle(px + 1, py + 2, 5);
    d.fillStyle(body).fillCircle(px, py, 5);
    d.lineStyle(2, 0xffffff, 0.8).lineBetween(px, py, px + Math.cos(g.facing) * 7, py + Math.sin(g.facing) * 7);
    if (g.state === 'stunned') {
      const a = this.time.now / 150;
      d.fillStyle(COLORS.blue).fillCircle(px + Math.cos(a) * 7, py - 8 + Math.sin(a) * 2, 1.5);
    } else if (g.suspicion > 0.02) {
      const color = g.state === 'alert' ? COLORS.red : COLORS.secScreen;
      d.fillStyle(0x000000, 0.6).fillRect(px - 7, py - 11, 14, 3);
      d.fillStyle(color).fillRect(px - 7, py - 11, 14 * g.suspicion, 3);
    }
  }

  private drawFog(): void {
    const w = this.world;
    if (this.lastVis === w.visible) return;
    this.lastVis = w.visible;
    const f = this.fogGfx;
    const g = w.grid;
    f.clear();
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        const i = g.index(x, y);
        if (w.visible[i]) continue;
        f.fillStyle(0x020403, w.explored[i] ? 0.72 : 1).fillRect(x * T, y * T, T, T);
      }
    }
  }

  private drawTop(): void {
    const w = this.world;
    const p = w.player;
    const t = this.topGfx;
    t.clear();

    for (const r of this.ripples) {
      const k = r.t / 0.6;
      t.lineStyle(1, r.color, 0.5 * (1 - k)).strokeCircle(r.x * T, r.y * T, r.r * T * k);
    }

    const px = p.x * T;
    const py = p.y * T;
    const alpha = p.inVent ? 0.55 : 1;
    t.fillStyle(0x000000, 0.4 * alpha).fillCircle(px + 1, py + 2, 4);
    t.fillStyle(COLORS.player, alpha).fillCircle(px, py, 4);
    t.fillStyle(COLORS.red, alpha).fillCircle(px, py, 1.5);
    if (p.sneaking) t.lineStyle(1, COLORS.player, 0.4).strokeCircle(px, py, 6);
    if (p.charging) t.lineStyle(1, COLORS.outlet, 0.8).strokeCircle(px, py, 7);
    if (p.hack) {
      const k = p.hack.progress / p.hack.duration;
      t.lineStyle(2, COLORS.green, 0.9);
      t.beginPath();
      t.arc(px, py, 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      t.strokePath();
    }
  }
}
