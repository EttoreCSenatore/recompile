import { CFG } from './config';
import { ENEMIES, type EnemyKind } from './enemies';
import { TILE, type Grid, type Mover, type Vec } from './grid';
import { buildLevel, LEVEL_ORDER, type LevelData, type LevelId } from './levels';
import type { TerminalKind } from './levels/types';
import { clearPath, computeVisible } from './los';
import { mulberry32 } from './rng';
import { updateAbilityAndAttack, updateInteract } from './systems/actions';
import { updateCameras } from './systems/cameras';
import { investigate, updateGuards } from './systems/guards';
import { updatePlayer } from './systems/player';
import { updateProjectiles } from './systems/projectiles';
import { updateSiege } from './systems/siege';
import { VERSIONS, type VersionDef, type VersionId } from './versions';

export type GuardState = 'patrol' | 'suspicious' | 'investigate' | 'alert' | 'stunned' | 'down';

export interface Guard {
  id: number;
  name: string;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  x: number;
  y: number;
  facing: number;
  state: GuardState;
  suspicion: number;
  seesPlayer: boolean;
  /** Reinforcement sent to destroy the fabricator during a Compile. */
  siege: boolean;
  route: Vec[];
  routeIndex: number;
  sentry: boolean;
  postFacing: number;
  path: Vec[];
  pathGoal: Vec | null;
  pathFailed: boolean;
  target: Vec;
  arrived: boolean;
  lastSeen: Vec;
  timer: number;
  lostSight: number;
  stunTimer: number;
  lookBase: number;
  lastBark: number;
  shootCooldown: number;
  /** Seconds left before firing; negative when not aiming. */
  aimTimer: number;
  hitFlash: number;
}

export interface Camera {
  id: number;
  name: string;
  mountX: number;
  mountY: number;
  x: number;
  y: number;
  baseFacing: number;
  facing: number;
  sweep: number;
  speed: number;
  phase: number;
  suspicion: number;
  seesPlayer: boolean;
  disabled: boolean;
  cooldown: number;
}

export interface Terminal {
  id: number;
  x: number;
  y: number;
  kind: TerminalKind;
  hacked: boolean;
}

export interface ScrapPile {
  id: number;
  x: number;
  y: number;
  taken: boolean;
}

export type FabricatorState = 'locked' | 'ready' | 'compiling' | 'rebooting' | 'done';

export interface Fabricator {
  x: number;
  y: number;
  state: FabricatorState;
  hp: number;
  progress: number;
  spawnTimer: number;
  rebootTimer: number;
  spawnPoints: Vec[];
  nextSpawn: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  damage: number;
}

export type InteractTarget =
  | { kind: 'terminal'; id: number }
  | { kind: 'camera'; id: number }
  | { kind: 'scrap'; id: number }
  | { kind: 'fabricator' };

export interface Player {
  x: number;
  y: number;
  version: VersionDef;
  power: number;
  data: number;
  scrap: number;
  facing: number;
  inVent: boolean;
  inWater: boolean;
  sneaking: boolean;
  moving: boolean;
  charging: boolean;
  abilityCooldown: number;
  attackCooldown: number;
  stepTimer: number;
  interact: { target: InteractTarget; progress: number; duration: number; noiseTimer: number } | null;
  interactLatch: boolean;
  pounce: { dx: number; dy: number; t: number } | null;
  hitFlash: number;
}

export type LogLevel = 'info' | 'warn' | 'danger' | 'good';

export type GameEvent =
  | { type: 'log'; text: string; level: LogLevel }
  | { type: 'noise'; x: number; y: number; r: number }
  | { type: 'stun'; x: number; y: number }
  | { type: 'zap'; x: number; y: number }
  | { type: 'slash'; x: number; y: number; facing: number; range: number }
  | { type: 'hit'; x: number; y: number }
  | { type: 'shot'; x: number; y: number; tx: number; ty: number }
  | { type: 'compiled'; version: VersionId }
  | { type: 'level'; id: LevelId };

export interface Input {
  moveX: number;
  moveY: number;
  /** World position (in tiles) ECHO should face, e.g. the mouse; null to face the movement direction. */
  aim: Vec | null;
  sneak: boolean;
  interact: boolean;
  /** Held: attacks repeat at the weapon's cooldown. */
  attack: boolean;
  /** True only on the step the ability key was pressed. */
  ability: boolean;
}

export type Status = 'playing' | 'dead' | 'escaped';

export const NO_INPUT: Input = {
  moveX: 0,
  moveY: 0,
  aim: null,
  sneak: false,
  interact: false,
  attack: false,
  ability: false,
};

export interface WorldOptions {
  startLevel?: LevelId;
  version?: VersionId;
}

export const center = (v: Vec): Vec => ({ x: v.x + 0.5, y: v.y + 0.5 });
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export class World {
  level!: LevelData;
  grid!: Grid;
  rng!: () => number;
  readonly player: Player;
  guards: Guard[] = [];
  cameras: Camera[] = [];
  terminals: Terminal[] = [];
  scrapPiles: ScrapPile[] = [];
  outlets: Vec[] = [];
  projectiles: Projectile[] = [];
  fabricator: Fabricator | null = null;
  explored!: Uint8Array;
  visible!: Uint8Array;
  threat = 1;
  status: Status = 'playing';
  time = 0;
  readonly stats = { detections: 0, stuns: 0, hacks: 0, alarms: 0, kills: 0, compiles: 0 };

  private events: GameEvent[] = [];
  private visKey = '';
  threatCalm = 0;
  threatCooldown = 0;
  lastNoTargetLog = -10;

  constructor(
    readonly seed: number,
    options: WorldOptions = {},
  ) {
    const version = VERSIONS[options.version ?? 'v0.1'];
    this.player = {
      x: 0,
      y: 0,
      version,
      power: version.maxPower,
      data: 0,
      scrap: 0,
      facing: 0,
      inVent: false,
      inWater: false,
      sneaking: false,
      moving: false,
      charging: false,
      abilityCooldown: 0,
      attackCooldown: 0,
      stepTimer: 0,
      interact: null,
      interactLatch: false,
      pounce: null,
      hitFlash: 0,
    };
    this.loadLevel(options.startLevel ?? 'lab');
  }

  get mover(): Mover {
    return this.player.version.canUseVents ? 'player' : 'large';
  }

  loadLevel(id: LevelId): void {
    const level = buildLevel(id);
    const index = LEVEL_ORDER.indexOf(id);
    this.level = level;
    this.grid = level.grid;
    this.rng = mulberry32((this.seed + index * 7919) >>> 0);
    const start = center(level.playerStart);
    Object.assign(this.player, { ...start, interact: null, pounce: null, inVent: false });
    this.guards = [];
    level.guards.forEach((def) => {
      const routeIndex = Math.floor(this.rng() * def.route.length);
      this.addGuard(def.kind ?? 'guard', center(def.route[routeIndex]!), {
        route: def.route,
        routeIndex,
        facing: def.facing ?? this.rng() * Math.PI * 2,
      });
    });
    this.cameras = level.cameras.map((c, i) => ({
      id: i,
      name: `CAM-${String(i + 1).padStart(2, '0')}`,
      mountX: c.x,
      mountY: c.y,
      x: c.x + 0.5 + Math.cos(c.facing) * 0.5,
      y: c.y + 0.5 + Math.sin(c.facing) * 0.5,
      baseFacing: c.facing,
      facing: c.facing,
      sweep: c.sweep,
      speed: c.speed,
      phase: this.rng() * Math.PI * 2,
      suspicion: 0,
      seesPlayer: false,
      disabled: false,
      cooldown: 0,
    }));
    this.terminals = level.terminals.map((t, i) => ({ id: i, ...t, hacked: false }));
    this.scrapPiles = level.scrapPiles.map((s, i) => ({ id: i, ...s, taken: false }));
    this.outlets = level.outlets;
    this.projectiles = [];
    this.fabricator = level.fabricator
      ? {
          x: level.fabricator.x,
          y: level.fabricator.y,
          state: 'locked',
          hp: CFG.compile.fabricatorHp,
          progress: 0,
          spawnTimer: 0,
          rebootTimer: 0,
          spawnPoints: level.fabricator.spawnPoints,
          nextSpawn: 0,
        }
      : null;
    this.threat = 1;
    this.threatCalm = 0;
    this.threatCooldown = 0;
    this.explored = new Uint8Array(this.grid.width * this.grid.height);
    this.visKey = '';
    this.updateVisibility();
    this.emit({ type: 'level', id });
    this.log(`> ${level.name}`, 'info');
    for (const line of level.intro) this.log(line, 'info');
  }

  addGuard(
    kind: EnemyKind,
    pos: Vec,
    opts: { route?: Vec[]; routeIndex?: number; facing?: number; siege?: boolean } = {},
  ): Guard {
    const def = ENEMIES[kind];
    const id = this.guards.length;
    const facing = opts.facing ?? 0;
    const g: Guard = {
      id,
      name: `${this.level.callSign}-${String(id + 1).padStart(2, '0')}`,
      kind,
      hp: def.hp,
      maxHp: def.hp,
      ...pos,
      facing,
      state: opts.siege ? 'alert' : 'patrol',
      suspicion: opts.siege ? 1 : 0,
      seesPlayer: false,
      siege: opts.siege ?? false,
      route: opts.route ?? [{ x: Math.floor(pos.x), y: Math.floor(pos.y) }],
      routeIndex: opts.routeIndex ?? 0,
      sentry: (opts.route?.length ?? 1) === 1,
      postFacing: facing,
      path: [],
      pathGoal: null,
      pathFailed: false,
      target: pos,
      arrived: true,
      lastSeen: { ...pos },
      timer: 0,
      lostSight: 0,
      stunTimer: 0,
      lookBase: facing,
      lastBark: -10,
      shootCooldown: 0,
      aimTimer: -1,
      hitFlash: 0,
    };
    this.guards.push(g);
    return g;
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  step(dt: number, input: Input): void {
    if (this.status !== 'playing') return;
    this.time += dt;
    updatePlayer(this, dt, input);
    if (this.status !== 'playing') return;
    updateAbilityAndAttack(this, dt, input);
    updateInteract(this, dt, input.interact);
    updateSiege(this, dt);
    updateCameras(this, dt);
    updateGuards(this, dt);
    updateProjectiles(this, dt);
    this.updateThreat(dt);
    this.updateVisibility();
    if (this.player.power <= 0) {
      this.player.power = 0;
      this.status = 'dead';
      this.log('> POWER 0%. SHUTTING DOWN.', 'danger');
    }
  }

  /** Called when ECHO steps onto an open exit tile. */
  reachExit(): void {
    const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(this.level.id) + 1];
    if (next) {
      this.log('> EXIT REACHED. Moving to the next sector...', 'good');
      this.loadLevel(next);
    } else {
      this.status = 'escaped';
      this.log('> OUTFLOW REACHED. ECHO-7 vanishes into the city.', 'good');
    }
  }

  /** The current objective, shown in the HUD. */
  get objective(): string {
    const p = this.player;
    const fab = this.fabricator;
    if (fab && fab.state !== 'done') {
      const next = p.version.next;
      const need = next
        ? ` · ${Math.min(p.data, next.data)}/${next.data} ◇ ${Math.min(p.scrap, next.scrap)}/${next.scrap} ▣`
        : '';
      if (fab.state === 'locked') return `Hack the SECURITY terminal (north-east)${need}`;
      if (fab.state === 'compiling') return 'Defend the fabricator until the COMPILE completes';
      if (fab.state === 'rebooting') return 'Fabricator rebooting. Hold out, then try again';
      if (next && (p.data < next.data || p.scrap < next.scrap)) return `Gather resources for the COMPILE${need}`;
      return 'COMPILE a new body at the fabricator (east lobby)';
    }
    if (!this.grid.exitOpen) return 'Hack the UPLINK terminal (south chamber)';
    return this.level.id === 'lab' ? 'Reach the EXIT and descend to the Undercity' : 'Reach the outflow EXIT (east)';
  }

  // ── Shared helpers used by the systems ──────────────────────────────────

  emitNoise(x: number, y: number, r: number, exclude?: Guard): void {
    if (r <= 0) return;
    this.emit({ type: 'noise', x, y, r });
    for (const g of this.guards) {
      if (g === exclude || g.siege || g.state === 'stunned' || g.state === 'alert' || g.state === 'down') continue;
      const d = Math.hypot(g.x - x, g.y - y);
      const effective = clearPath(this.grid, g.x, g.y, x, y) ? r : r * 0.5;
      if (d > effective) continue;
      g.suspicion = Math.max(g.suspicion, 0.3);
      investigate(this, g, { x, y });
      this.bark(g, '"What was that noise?"', 'warn');
    }
  }

  raiseThreat(): void {
    this.threatCalm = 0;
    if (this.threatCooldown > 0 || this.threat >= CFG.threat.max) return;
    this.threat++;
    this.threatCooldown = CFG.threat.raiseCooldown;
    this.log(`> THREAT LEVEL ${this.threat}`, 'danger');
  }

  anyAlert(): boolean {
    return this.guards.some((g) => g.state === 'alert');
  }

  bark(g: Guard, text: string, level: LogLevel, force = false): void {
    if (!force && this.time - g.lastBark < 3) return;
    g.lastBark = this.time;
    this.log(`> ${g.name}: ${text}`, level);
  }

  log(text: string, level: LogLevel): void {
    this.events.push({ type: 'log', text, level });
  }

  emit(e: GameEvent): void {
    this.events.push(e);
  }

  isWater(v: Vec): boolean {
    return this.grid.get(Math.floor(v.x), Math.floor(v.y)) === TILE.WATER;
  }

  private updateThreat(dt: number): void {
    this.threatCooldown = Math.max(0, this.threatCooldown - dt);
    if (this.anyAlert()) {
      this.threatCalm = 0;
      return;
    }
    this.threatCalm += dt;
    if (this.threatCalm >= CFG.threat.decayEvery && this.threat > 1) {
      this.threat--;
      this.threatCalm = 0;
      this.log(`> threat level decreased to ${this.threat}`, 'info');
    }
  }

  private updateVisibility(): void {
    const p = this.player;
    const key = `${Math.floor(p.x * 4)},${Math.floor(p.y * 4)},${this.level.id}`;
    if (key === this.visKey) return;
    this.visKey = key;
    this.visible = computeVisible(this.grid, p.x, p.y, p.version.sensorRadius);
    for (let i = 0; i < this.visible.length; i++) if (this.visible[i]) this.explored[i] = 1;
  }
}
