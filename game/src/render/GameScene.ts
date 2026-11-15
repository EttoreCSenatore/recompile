import Phaser from 'phaser';
import { CFG } from '../sim/config';
import { TILE, type Vec } from '../sim/grid';
import { castRay } from '../sim/los';
import { randomSeed } from '../sim/rng';
import { NO_INPUT, World, type Guard, type GuardState, type Input } from '../sim/world';
import { Hud } from './hud';

const T = 16; // pixels per tile
const STEP = 1 / 60; // fixed simulation step
const CONE_RAYS = 28;
const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const COLORS = {
  floor: 0x17261d,
  floorEdge: 0x1d3125,
  wall: 0x34463b,
  wallEdge: 0x56705f,
  vent: 0x122633,
  ventGrate: 0x3f7088,
  water: 0x0f3346,
  waterLine: 0x1f5a78,
  player: 0x39ff6a,
  outlet: 0xffd447,
  dataScreen: 0x39ffd0,
  secScreen: 0xffb000,
  deadScreen: 0x2a2f2c,
  terminalBody: 0x2b3a33,
  scrap: 0x8a7a66,
  scrapLight: 0xb8a68c,
  camBody: 0x8899aa,
  guard: 0xe08a4a,
  officer: 0xd9c24a,
  red: 0xff3b3b,
  green: 0x39ff6a,
  blue: 0x6aa8ff,
  white: 0xffffff,
  bullet: 0xfff3a0,
};

const GUARD_CONE: Record<GuardState, [number, number]> = {
  patrol: [0xfff1a8, 0.12],
  suspicious: [0xffb000, 0.2],
  investigate: [0xffb000, 0.15],
  alert: [0xff3b3b, 0.22],
  stunned: [0x6aa8ff, 0],
  down: [0, 0],
};

type Mode = 'title' | 'playing' | 'paused' | 'over';

interface Fx {
  kind: 'ring' | 'slash' | 'tracer';
  x: number;
  y: number;
  r: number;
  t: number;
  life: number;
  color: number;
  facing?: number;
  tx?: number;
  ty?: number;
}

type Keys = Record<
  'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'SHIFT' | 'F' | 'SPACE',
  Phaser.Input.Keyboard.Key
>;

/** Gamepad buttons (standard mapping). */
const PAD = { A: 0, X: 2, START: 9, L3: 10 } as const;

export class GameScene extends Phaser.Scene {
  private world!: World;
  private hud = new Hud();
  private mode: Mode = 'title';
  private keys!: Keys;
  private acc = 0;
  /** One-shot presses captured from keydown events so quick taps are never lost between frames. */
  private pressed = new Set<string>();
  private mapGfx!: Phaser.GameObjects.Graphics;
  private dynGfx!: Phaser.GameObjects.Graphics;
  private fogGfx!: Phaser.GameObjects.Graphics;
  private topGfx!: Phaser.GameObjects.Graphics;
  private follow = { x: 0, y: 0 };
  private lastVis: Uint8Array | null = null;
  private fx: Fx[] = [];
  private mouseActiveUntil = 0;
  private padPrev: Record<number, boolean> = {};

  constructor(private readonly initialSeed: number) {
    super('game');
  }

  create(): void {
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,F,SPACE', true) as Keys;
    for (const code of ['ENTER', 'ESC', 'R', 'Q']) {
      kb.addKey(code, true);
      kb.on(`keydown-${code}`, (e: KeyboardEvent) => {
        if (!e.repeat) this.pressed.add(code);
      });
    }
    this.input.on('pointermove', () => (this.mouseActiveUntil = this.time.now + 3000));
    this.input.on('pointerdown', () => (this.mouseActiveUntil = this.time.now + 3000));
    this.input.mouse?.disableContextMenu();

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
    this.fx = [];
    this.onLevelLoaded();
    this.flushEvents();
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(seed));
    window.history.replaceState(null, '', url);
  }

  private onLevelLoaded(): void {
    const g = this.world.grid;
    this.lastVis = null;
    this.cameras.main.setBounds(0, 0, g.width * T, g.height * T);
    this.follow.x = this.world.player.x * T;
    this.follow.y = this.world.player.y * T;
    this.cameras.main.centerOn(this.follow.x, this.follow.y);
    this.drawMap();
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
    const pad = this.pad();
    const padEdge = (b: number) => {
      const down = !!pad?.isButtonDown(b);
      const was = this.padPrev[b] ?? false;
      this.padPrev[b] = down;
      return down && !was;
    };
    const padConfirm = padEdge(PAD.A);
    const padStart = padEdge(PAD.START);
    if (padEdge(PAD.X)) this.pressed.add('Q');

    const enter = this.pressed.delete('ENTER') || padConfirm;
    const esc = this.pressed.delete('ESC') || padStart;
    const r = this.pressed.delete('R');

    switch (this.mode) {
      case 'title':
        if (enter || padStart) this.setMode('playing');
        break;
      case 'paused':
        if (esc || enter) this.setMode('playing');
        else if (r) {
          this.newRun(this.world.seed);
          this.setMode('playing');
        }
        break;
      case 'over':
        if (enter || padStart) {
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
    // The ability press stays queued until a simulation step consumes it; drop it outside gameplay.
    if (this.mode !== 'playing') this.pressed.delete('Q');

    this.updateFx(deltaMs / 1000);
    this.render();
    this.hud.update(this.world);
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | null {
    const gp = this.input.gamepad;
    return gp && gp.total > 0 ? gp.pad1 : null;
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
    const pad = this.pad();
    let x = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let y = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    let aim: Vec | null = null;
    const p = this.world.player;
    if (pad) {
      if (pad.leftStick.length() > 0.2) {
        x = pad.leftStick.x;
        y = pad.leftStick.y;
      }
      if (pad.rightStick.length() > 0.3) aim = { x: p.x + pad.rightStick.x * 3, y: p.y + pad.rightStick.y * 3 };
    }
    if (!aim && this.time.now < this.mouseActiveUntil) {
      const ptr = this.input.activePointer;
      const wp = ptr.positionToCamera(this.cameras.main) as Vec;
      aim = { x: wp.x / T, y: wp.y / T };
    }
    const mouseAttack = this.input.activePointer.leftButtonDown();
    return {
      ...NO_INPUT,
      moveX: x,
      moveY: y,
      aim,
      sneak: k.SHIFT.isDown || !!pad?.isButtonDown(PAD.L3),
      interact: k.F.isDown || (pad?.R1 ?? 0) > 0.5,
      attack: k.SPACE.isDown || mouseAttack || (pad?.R2 ?? 0) > 0.3,
      ability: this.pressed.delete('Q'),
    };
  }

  private flushEvents(): void {
    for (const e of this.world.drainEvents()) {
      switch (e.type) {
        case 'log':
          this.hud.log(e.text, e.level);
          break;
        case 'noise':
          this.addFx({ kind: 'ring', x: e.x, y: e.y, r: e.r, life: 0.6, color: COLORS.green });
          break;
        case 'stun':
          this.addFx({ kind: 'ring', x: e.x, y: e.y, r: 1.3, life: 0.45, color: COLORS.blue });
          break;
        case 'zap':
        case 'hit':
          this.addFx({ kind: 'ring', x: e.x, y: e.y, r: 0.8, life: 0.3, color: COLORS.red });
          break;
        case 'slash':
          this.addFx({ kind: 'slash', x: e.x, y: e.y, r: e.range, life: 0.15, color: COLORS.white, facing: e.facing });
          break;
        case 'shot':
          this.addFx({ kind: 'tracer', x: e.x, y: e.y, r: 0, life: 0.08, color: COLORS.bullet, tx: e.tx, ty: e.ty });
          break;
        case 'compiled':
          this.cameras.main.flash(400, 57, 255, 106);
          if (!REDUCED_MOTION) this.cameras.main.shake(250, 0.006);
          break;
        case 'level':
          this.onLevelLoaded();
          break;
      }
    }
  }

  private addFx(f: Omit<Fx, 't'>): void {
    this.fx.push({ ...f, t: 0 });
  }

  private updateFx(dt: number): void {
    for (const f of this.fx) f.t += dt;
    this.fx = this.fx.filter((f) => f.t < f.life);
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
        } else if (t === TILE.WATER) {
          m.fillStyle(COLORS.water).fillRect(px, py, T, T);
          m.fillStyle(COLORS.waterLine);
          m.fillRect(px + 2 + ((x * 5 + y * 3) % 6), py + 5, 5, 1);
          m.fillRect(px + 1 + ((x * 3 + y * 7) % 7), py + 11, 6, 1);
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
    const now = this.time.now;
    d.clear();

    // Exit door.
    const ex = w.level.exit.x * T;
    const ey = w.level.exit.y * T;
    if (w.grid.exitOpen) {
      d.fillStyle(COLORS.green, 0.6 + 0.4 * Math.sin(now / 200)).fillRect(ex, ey, T, T);
    } else {
      d.fillStyle(0x5a1414).fillRect(ex, ey, T, T);
      d.lineStyle(1, COLORS.red).lineBetween(ex + 3, ey + 3, ex + T - 3, ey + T - 3);
      d.lineBetween(ex + T - 3, ey + 3, ex + 3, ey + T - 3);
    }

    for (const o of w.outlets) {
      d.fillStyle(COLORS.outlet, w.player.charging ? 1 : 0.7).fillRect(o.x * T + 6, o.y * T + 5, 4, 6);
    }

    for (const s of w.scrapPiles) {
      const px = s.x * T;
      const py = s.y * T;
      const a = s.taken ? 0.25 : 1;
      d.fillStyle(COLORS.scrap, a).fillRect(px + 3, py + 8, 10, 5);
      d.fillStyle(COLORS.scrapLight, a).fillRect(px + 5, py + 5, 4, 4).fillRect(px + 9, py + 7, 3, 2);
    }

    for (const t of w.terminals) {
      const px = t.x * T;
      const py = t.y * T;
      d.fillStyle(COLORS.terminalBody).fillRect(px + 2, py + 3, 12, 10);
      const screen = t.hacked ? COLORS.deadScreen : t.kind === 'security' ? COLORS.secScreen : COLORS.dataScreen;
      d.fillStyle(screen).fillRect(px + 4, py + 5, 8, 5);
    }

    this.drawFabricator(now);

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
      this.drawGuard(g, now);
    }

    this.drawFog();
    this.drawTop(now);
  }

  private drawFabricator(now: number): void {
    const fab = this.world.fabricator;
    if (!fab) return;
    const d = this.dynGfx;
    const cx = (fab.x + 0.5) * T;
    const cy = (fab.y + 0.5) * T;
    const color =
      fab.state === 'locked'
        ? 0x555555
        : fab.state === 'rebooting'
          ? COLORS.red
          : fab.state === 'done'
            ? COLORS.green
            : COLORS.secScreen;
    d.fillStyle(0x223029).fillRect(cx - 11, cy - 11, 22, 22);
    d.lineStyle(1, color, 0.9).strokeRect(cx - 11, cy - 11, 22, 22);
    const pulse = fab.state === 'compiling' ? 0.6 + 0.4 * Math.sin(now / 120) : 1;
    d.fillStyle(color, pulse).fillRect(cx - 4, cy - 4, 8, 8);
    if (fab.state === 'compiling') {
      const k = fab.progress / CFG.compile.duration;
      d.lineStyle(2, COLORS.green, 0.9);
      d.beginPath();
      d.arc(cx, cy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      d.strokePath();
    }
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

  private drawGuard(g: Guard, now: number): void {
    const d = this.dynGfx;
    const px = g.x * T;
    const py = g.y * T;
    if (g.state === 'down') {
      d.fillStyle(0x3a2a24, 0.9).fillEllipse(px, py + 1, 12, 7);
      d.lineStyle(1, 0x7a5a4a, 0.8).lineBetween(px - 4, py - 2, px + 4, py + 4);
      return;
    }
    const base = g.kind === 'officer' ? COLORS.officer : COLORS.guard;
    const body =
      g.hitFlash > 0 ? COLORS.white : g.state === 'stunned' ? COLORS.blue : g.state === 'alert' ? COLORS.red : base;
    d.fillStyle(0x000000, 0.4).fillCircle(px + 1, py + 2, 5);
    d.fillStyle(body).fillCircle(px, py, 5);
    if (g.kind === 'officer') d.fillStyle(0x1b2a4a).fillRect(px - 3, py - 5, 6, 2); // cap
    d.lineStyle(2, COLORS.white, 0.8).lineBetween(px, py, px + Math.cos(g.facing) * 7, py + Math.sin(g.facing) * 7);

    // Telegraphed shot: a flickering red line toward ECHO while the officer aims.
    if (g.aimTimer >= 0) {
      const p = this.world.player;
      const alpha = 0.35 + 0.5 * Math.abs(Math.sin(now / 40));
      d.lineStyle(1, COLORS.red, alpha).lineBetween(px, py, p.x * T, p.y * T);
    }

    if (g.state === 'stunned') {
      const a = now / 150;
      d.fillStyle(COLORS.blue).fillCircle(px + Math.cos(a) * 7, py - 8 + Math.sin(a) * 2, 1.5);
    } else if (g.suspicion > 0.02 && g.state !== 'alert') {
      d.fillStyle(0x000000, 0.6).fillRect(px - 7, py - 11, 14, 3);
      d.fillStyle(COLORS.secScreen).fillRect(px - 7, py - 11, 14 * g.suspicion, 3);
    }
    if (g.hp < g.maxHp) {
      for (let i = 0; i < g.maxHp; i++) {
        d.fillStyle(i < g.hp ? COLORS.red : 0x333333).fillRect(px - 6 + i * 4, py - 15, 3, 2);
      }
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

  private drawTop(now: number): void {
    const w = this.world;
    const p = w.player;
    const t = this.topGfx;
    t.clear();

    for (const b of w.projectiles) t.fillStyle(COLORS.bullet).fillCircle(b.x * T, b.y * T, 1.5);

    for (const f of this.fx) {
      const k = f.t / f.life;
      if (f.kind === 'ring') {
        t.lineStyle(1, f.color, 0.5 * (1 - k)).strokeCircle(f.x * T, f.y * T, f.r * T * k);
      } else if (f.kind === 'slash') {
        t.lineStyle(2, f.color, 0.9 * (1 - k));
        t.beginPath();
        t.arc(f.x * T, f.y * T, f.r * T, f.facing! - 0.9, f.facing! + 0.9);
        t.strokePath();
      } else {
        t.lineStyle(1, f.color, 0.8 * (1 - k)).lineBetween(f.x * T, f.y * T, f.tx! * T, f.ty! * T);
      }
    }

    const px = p.x * T;
    const py = p.y * T;
    const alpha = p.inVent ? 0.55 : 1;
    const color = p.hitFlash > 0 ? COLORS.red : COLORS.player;
    t.fillStyle(0x000000, 0.4 * alpha).fillCircle(px + 1, py + 2, p.version.radius * T);
    if (p.version.id === 'v1') {
      // SCRAPPER: quadruped body with four legs and a forward sensor.
      const legPhase = p.moving ? Math.sin(now / 60) * 2 : 0;
      t.lineStyle(2, 0x2fbf55, alpha);
      for (const [ox, oy, s] of [
        [-4, -4, 1],
        [4, -4, -1],
        [-4, 4, -1],
        [4, 4, 1],
      ] as const) {
        t.lineBetween(px, py, px + ox * 1.6 + s * legPhase, py + oy * 1.6);
      }
      t.fillStyle(color, alpha).fillCircle(px, py, 5);
      t.fillStyle(COLORS.red, alpha).fillCircle(px + Math.cos(p.facing) * 3, py + Math.sin(p.facing) * 3, 1.5);
    } else {
      t.fillStyle(color, alpha).fillCircle(px, py, 4);
      t.fillStyle(COLORS.red, alpha).fillCircle(px, py, 1.5);
    }
    if (p.sneaking) t.lineStyle(1, COLORS.player, 0.4).strokeCircle(px, py, 8);
    if (p.charging) t.lineStyle(1, COLORS.outlet, 0.8).strokeCircle(px, py, 9);
    if (p.interact) {
      const k = p.interact.progress / p.interact.duration;
      t.lineStyle(2, COLORS.green, 0.9);
      t.beginPath();
      t.arc(px, py, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
      t.strokePath();
    }
    if (p.version.attack && this.time.now < this.mouseActiveUntil) {
      t.lineStyle(1, COLORS.green, 0.35).lineBetween(
        px + Math.cos(p.facing) * 8,
        py + Math.sin(p.facing) * 8,
        px + Math.cos(p.facing) * 14,
        py + Math.sin(p.facing) * 14,
      );
    }
  }
}
