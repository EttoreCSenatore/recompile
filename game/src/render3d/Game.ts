import { parseSeed, randomSeed } from '../sim/rng';
import { NO_INPUT, World, type Input } from '../sim/world';
import { Hud } from '../render/hud';
import { buildMenu, type MenuKind, type MenuModel } from '../render/menu';
import { Renderer3D } from './Renderer3D';

const STEP = 1 / 60; // fixed simulation step
const MOUSE_AIM_MS = 3000;

/** Gamepad buttons (standard mapping). */
const PAD = { A: 0, B: 1, X: 2, Y: 3, R1: 5, R2: 7, START: 9, L3: 10, UP: 12, DOWN: 13 } as const;

type Mode = 'title' | 'playing' | 'paused' | 'over' | 'menu';

export class Game {
  private world!: World;
  private readonly hud = new Hud();
  private readonly view: Renderer3D;
  private mode: Mode = 'title';
  private acc = 0;
  private last = performance.now();
  private frames = 0;
  private menuKind: MenuKind = 'loadout';
  private menuIndex = 0;

  private readonly down = new Set<string>();
  /** One-shot presses captured from keydown so quick taps are never lost between frames. */
  private readonly pressed = new Set<string>();
  private mouseDown = false;
  private mouseNdc = { x: 0, y: 0 };
  private mouseActiveUntil = 0;
  private padPrev: Record<number, boolean> = {};

  constructor(parent: HTMLElement, initialSeed: number) {
    this.view = new Renderer3D(parent);
    this.bindInput();
    this.newRun(initialSeed);
    this.setMode('title');
    requestAnimationFrame((t) => this.frame(t));
  }

  /** For the Playwright smoke test and debugging in the console. */
  debug() {
    return {
      frames: this.frames,
      mode: this.mode,
      world: this.world,
    };
  }

  // ── Input plumbing ───────────────────────────────────────────────────────

  private bindInput(): void {
    const canvas = this.view.canvas;
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      this.down.add(e.code);
      if (!e.repeat) this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.mouseDown = true;
      this.pointerMoved(e);
    });
    window.addEventListener('pointerup', () => (this.mouseDown = false));
    canvas.addEventListener('pointermove', (e) => this.pointerMoved(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouseDown = false;
      if (this.mode === 'playing') this.setMode('paused');
    });
  }

  private pointerMoved(e: PointerEvent): void {
    this.mouseNdc = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight) * 2 + 1 };
    this.mouseActiveUntil = performance.now() + MOUSE_AIM_MS;
  }

  private pad(): Gamepad | null {
    return navigator.getGamepads?.().find((g) => g?.connected) ?? null;
  }

  private key(...codes: string[]): boolean {
    return codes.some((c) => this.down.has(c));
  }

  /** Consumes a one-shot press of any of the given key codes. */
  private take(...codes: string[]): boolean {
    let hit = false;
    for (const c of codes) hit = this.pressed.delete(c) || hit;
    return hit;
  }

  // ── Run and modes ────────────────────────────────────────────────────────

  private newRun(seed: number): void {
    this.world = new World(seed);
    this.menuIndex = 0;
    this.hud.reset(seed);
    this.acc = 0;
    this.view.setWorld(this.world);
    this.flushEvents();
    const url = new URL(window.location.href);
    url.searchParams.set('seed', String(seed));
    window.history.replaceState(null, '', url);
  }

  private setMode(mode: Mode): void {
    this.mode = mode;
    this.hud.setVisible(mode === 'playing' || mode === 'paused' || mode === 'menu');
    if (mode === 'title') this.hud.showTitle(this.world.seed);
    else if (mode === 'paused') this.hud.showPause();
    else if (mode === 'over') this.hud.showEnd(this.world);
    else this.hud.hideOverlay();
  }

  private menu(): MenuModel {
    return buildMenu(this.world, this.menuKind, () => this.closeMenu());
  }

  private openMenu(kind: MenuKind): void {
    this.menuKind = kind;
    this.menuIndex = 0;
    this.mode = 'menu';
    this.hud.setVisible(true);
    this.hud.showMenu(this.menu(), this.menuIndex, (i) => this.pickRow(i));
  }

  private closeMenu(): void {
    if (this.menuKind === 'port' && this.world.port) return; // must confirm the port first
    this.setMode('playing');
  }

  private pickRow(i: number): void {
    const row = this.menu().rows[i];
    if (!row || row.disabled) return;
    this.menuIndex = i;
    row.act();
    this.afterMenuAction();
  }

  private afterMenuAction(): void {
    this.flushEvents();
    if (this.mode !== 'menu') return;
    if (this.menuKind === 'port' && !this.world.port) {
      this.setMode('playing');
      return;
    }
    const model = this.menu();
    this.menuIndex = Math.min(this.menuIndex, model.rows.length - 1);
    this.hud.showMenu(model, this.menuIndex, (i) => this.pickRow(i));
  }

  private updateMenu(k: { up: boolean; down: boolean; confirm: boolean; alt: boolean; close: boolean }): void {
    if (k.close) {
      this.closeMenu();
      return;
    }
    const model = this.menu();
    const n = model.rows.length;
    if (k.up) this.menuIndex = (this.menuIndex + n - 1) % n;
    if (k.down) this.menuIndex = (this.menuIndex + 1) % n;
    if (k.up || k.down) this.hud.showMenu(model, this.menuIndex, (i) => this.pickRow(i));
    if (k.confirm) this.pickRow(this.menuIndex);
    else if (k.alt) {
      const row = model.rows[this.menuIndex];
      if (row?.alt) {
        row.alt();
        this.afterMenuAction();
      }
    }
  }

  // ── Frame ────────────────────────────────────────────────────────────────

  private frame(t: number): void {
    const dt = Math.min((t - this.last) / 1000, 0.1);
    this.last = t;
    this.update(dt);
    this.view.render(dt, t);
    this.hud.update(this.world);
    this.frames++;
    requestAnimationFrame((n) => this.frame(n));
  }

  private update(dt: number): void {
    const pad = this.pad();
    const padEdge = (b: number) => {
      const isDown = !!pad?.buttons[b]?.pressed;
      const was = this.padPrev[b] ?? false;
      this.padPrev[b] = isDown;
      return isDown && !was;
    };
    const padConfirm = padEdge(PAD.A);
    const padStart = padEdge(PAD.START);
    const padX = padEdge(PAD.X);
    const padY = padEdge(PAD.Y);
    const padB = padEdge(PAD.B);
    const padUp = padEdge(PAD.UP);
    const padDown = padEdge(PAD.DOWN);
    if (padX && this.mode !== 'menu') this.pressed.add('KeyQ');
    if (padY) this.pressed.add('KeyE');

    const enter = this.take('Enter') || padConfirm;
    const esc = this.take('Escape') || padStart;
    const r = this.take('KeyR');

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
      case 'menu':
        this.updateMenu({
          up: this.take('ArrowUp', 'KeyW') || padUp,
          down: this.take('ArrowDown', 'KeyS') || padDown,
          confirm: enter,
          alt: this.take('KeyX') || padX,
          close: this.take('KeyE') || esc || padB,
        });
        break;
      case 'playing':
        if (this.take('KeyE')) {
          this.openMenu('loadout');
          break;
        }
        if (esc) {
          this.setMode('paused');
          break;
        }
        this.simulate(dt);
        break;
    }
    // The ability press stays queued until a simulation step consumes it; drop it outside gameplay.
    if (this.mode !== 'playing') this.pressed.delete('KeyQ');
    if (this.mode !== 'menu') for (const k of ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS', 'KeyX']) this.pressed.delete(k);
    if (this.mode !== 'playing' && this.mode !== 'menu') this.pressed.delete('KeyE');
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
    else if (this.world.port) this.openMenu('port');
  }

  private readInput(): Input {
    const pad = this.pad();
    let x = (this.key('KeyD', 'ArrowRight') ? 1 : 0) - (this.key('KeyA', 'ArrowLeft') ? 1 : 0);
    let y = (this.key('KeyS', 'ArrowDown') ? 1 : 0) - (this.key('KeyW', 'ArrowUp') ? 1 : 0);
    let aim: { x: number; y: number } | null = null;
    const p = this.world.player;
    if (pad) {
      const [lx = 0, ly = 0, rx = 0, ry = 0] = pad.axes;
      if (Math.hypot(lx, ly) > 0.2) {
        x = lx;
        y = ly;
      }
      if (Math.hypot(rx, ry) > 0.3) aim = { x: p.x + rx * 3, y: p.y + ry * 3 };
    }
    if (!aim && performance.now() < this.mouseActiveUntil) aim = this.view.pick(this.mouseNdc.x, this.mouseNdc.y);
    return {
      ...NO_INPUT,
      moveX: x,
      moveY: y,
      aim,
      sneak: this.key('ShiftLeft', 'ShiftRight') || !!pad?.buttons[PAD.L3]?.pressed,
      interact: this.key('KeyF') || (pad?.buttons[PAD.R1]?.value ?? 0) > 0.5,
      attack: this.key('Space') || this.mouseDown || (pad?.buttons[PAD.R2]?.value ?? 0) > 0.3,
      ability: this.take('KeyQ'),
    };
  }

  private flushEvents(): void {
    for (const e of this.world.drainEvents()) {
      if (e.type === 'log') this.hud.log(e.text, e.level);
      else if (e.type === 'level') this.view.buildLevel();
      else this.view.onEvent(e);
    }
  }
}

export function bootSeed(): number {
  return parseSeed(new URLSearchParams(window.location.search).get('seed')) ?? randomSeed();
}
