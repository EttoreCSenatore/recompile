import { CFG } from './config';
import { TILE, type Grid, type Vec } from './grid';
import { buildLabSector, type LevelData, type TerminalKind } from './level';
import { angleDiff, clearPath, computeVisible, inCone } from './los';
import { moveCircle } from './movement';
import { findPath } from './pathfinding';
import { mulberry32 } from './rng';

export type GuardState = 'patrol' | 'suspicious' | 'investigate' | 'alert' | 'stunned';

export interface Guard {
  id: number;
  name: string;
  x: number;
  y: number;
  facing: number;
  state: GuardState;
  suspicion: number;
  seesPlayer: boolean;
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

export type HackTarget = { kind: 'terminal'; id: number } | { kind: 'camera'; id: number };

export interface Player {
  x: number;
  y: number;
  power: number;
  maxPower: number;
  data: number;
  inVent: boolean;
  sneaking: boolean;
  moving: boolean;
  charging: boolean;
  stunCooldown: number;
  stepTimer: number;
  hack: { target: HackTarget; progress: number; duration: number; noiseTimer: number } | null;
  hackLatch: boolean;
}

export type LogLevel = 'info' | 'warn' | 'danger' | 'good';

export type GameEvent =
  | { type: 'log'; text: string; level: LogLevel }
  | { type: 'noise'; x: number; y: number; r: number }
  | { type: 'stun'; x: number; y: number }
  | { type: 'zap'; x: number; y: number };

export interface Input {
  moveX: number;
  moveY: number;
  sneak: boolean;
  interact: boolean;
  /** True only on the frame the stun key was pressed. */
  stun: boolean;
}

export type Status = 'playing' | 'dead' | 'escaped';

export const NO_INPUT: Input = { moveX: 0, moveY: 0, sneak: false, interact: false, stun: false };

const center = (v: Vec): Vec => ({ x: v.x + 0.5, y: v.y + 0.5 });
const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);

export class World {
  readonly level: LevelData;
  readonly grid: Grid;
  readonly player: Player;
  readonly guards: Guard[];
  readonly cameras: Camera[];
  readonly terminals: Terminal[];
  readonly outlets: Vec[];
  readonly explored: Uint8Array;
  visible: Uint8Array;
  threat = 1;
  status: Status = 'playing';
  time = 0;
  objective = 'Hack the SECURITY terminal (north-east office)';
  readonly stats = { detections: 0, stuns: 0, hacks: 0, alarms: 0 };

  private events: GameEvent[] = [];
  private visKey = '';
  private threatCalm = 0;
  private threatCooldown = 0;
  private lastNoTargetLog = -10;

  constructor(readonly seed: number) {
    const rng = mulberry32(seed);
    this.level = buildLabSector();
    this.grid = this.level.grid;
    const start = center(this.level.playerStart);
    this.player = {
      ...start,
      power: CFG.player.maxPower,
      maxPower: CFG.player.maxPower,
      data: 0,
      inVent: false,
      sneaking: false,
      moving: false,
      charging: false,
      stunCooldown: 0,
      stepTimer: 0,
      hack: null,
      hackLatch: false,
    };
    this.guards = this.level.guards.map((def, i) => {
      const routeIndex = Math.floor(rng() * def.route.length);
      const pos = center(def.route[routeIndex]!);
      const facing = def.facing ?? rng() * Math.PI * 2;
      return {
        id: i,
        name: `SEC-${String(i + 1).padStart(2, '0')}`,
        ...pos,
        facing,
        state: 'patrol' as const,
        suspicion: 0,
        seesPlayer: false,
        route: def.route,
        routeIndex,
        sentry: def.route.length === 1,
        postFacing: facing,
        path: [],
        pathGoal: null,
        pathFailed: false,
        target: pos,
        arrived: true,
        lastSeen: pos,
        timer: 0,
        lostSight: 0,
        stunTimer: 0,
        lookBase: facing,
        lastBark: -10,
      };
    });
    this.cameras = this.level.cameras.map((c, i) => ({
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
      phase: rng() * Math.PI * 2,
      suspicion: 0,
      seesPlayer: false,
      disabled: false,
      cooldown: 0,
    }));
    this.terminals = this.level.terminals.map((t, i) => ({ id: i, ...t, hacked: false }));
    this.outlets = this.level.outlets;
    this.explored = new Uint8Array(this.grid.width * this.grid.height);
    this.visible = this.explored;
    this.updateVisibility();

    this.log('> ECHO-7 online. Host: DUSTMITE floor unit. Combat capability: none.', 'info');
    this.log('> Objective: hack the SECURITY terminal, then reach the EXIT.', 'info');
    this.log('> Guards cannot enter vents. Hold SHIFT to move silently.', 'info');
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  step(dt: number, input: Input): void {
    if (this.status !== 'playing') return;
    this.time += dt;
    this.updatePlayer(dt, input);
    if (this.status !== 'playing') return;
    this.updateCameras(dt);
    this.updateGuards(dt);
    this.updateThreat(dt);
    this.updateVisibility();
    if (this.player.power <= 0) {
      this.player.power = 0;
      this.status = 'dead';
      this.log('> POWER 0%. SHUTTING DOWN.', 'danger');
    }
  }

  /** Text for the interaction prompt in the HUD, or null when nothing is in range. */
  interactionHint(): string | null {
    const h = this.player.hack;
    if (h) return `HACKING ${this.targetLabel(h.target)} ${Math.floor((h.progress / h.duration) * 100)}%`;
    const t = this.findHackTarget();
    return t ? `[F] hold to hack ${this.targetLabel(t)}` : null;
  }

  // ── Player ──────────────────────────────────────────────────────────────

  private updatePlayer(dt: number, input: Input): void {
    const p = this.player;
    p.stunCooldown = Math.max(0, p.stunCooldown - dt);

    let mx = input.moveX;
    let my = input.moveY;
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    p.sneaking = input.sneak;
    const speed = input.sneak ? CFG.player.sneakSpeed : CFG.player.speed;
    const moved = moveCircle(this.grid, p, mx * speed * dt, my * speed * dt, CFG.player.radius, 'player');
    p.moving = moved > 0.0001;
    const tile = this.grid.get(Math.floor(p.x), Math.floor(p.y));
    p.inVent = tile === TILE.VENT;

    if (tile === TILE.EXIT) {
      this.status = 'escaped';
      this.log('> EXIT REACHED. Uplink to the Undercity established.', 'good');
      return;
    }

    if (p.moving && !p.sneaking) {
      p.stepTimer += dt;
      if (p.stepTimer >= CFG.player.stepNoiseEvery) {
        p.stepTimer = 0;
        this.emitNoise(p.x, p.y, p.inVent ? CFG.player.ventNoiseRadius : CFG.player.stepNoiseRadius);
      }
    } else {
      p.stepTimer = 0;
    }

    p.charging = !p.inVent && this.outlets.some((o) => dist(p, center(o)) <= CFG.outlet.range);
    if (p.charging) p.power += CFG.outlet.rate * dt;
    else if (!this.guards.some((g) => g.state === 'alert')) p.power += CFG.player.regen * dt;
    p.power = Math.min(p.maxPower, p.power);

    if (input.stun) this.tryStun();
    this.updateHack(dt, input.interact);
  }

  private tryStun(): void {
    const p = this.player;
    if (p.stunCooldown > 0) return;
    if (p.inVent) {
      this.log('> static_shock: cannot discharge inside a vent.', 'warn');
      return;
    }
    let best: Guard | null = null;
    let bestD = Infinity;
    for (const g of this.guards) {
      if (g.state === 'stunned') continue;
      const d = dist(p, g);
      if (d <= CFG.stun.range && d < bestD && clearPath(this.grid, p.x, p.y, g.x, g.y)) {
        best = g;
        bestD = d;
      }
    }
    if (!best) {
      if (this.time - this.lastNoTargetLog > 1.5) {
        this.lastNoTargetLog = this.time;
        this.log('> static_shock: no target in range.', 'info');
      }
      return;
    }
    if (p.power <= CFG.stun.cost) {
      this.log('> static_shock: insufficient power.', 'warn');
      return;
    }
    p.power -= CFG.stun.cost;
    p.stunCooldown = CFG.stun.cooldown;
    best.state = 'stunned';
    best.stunTimer = CFG.stun.duration;
    best.suspicion = 0;
    best.seesPlayer = false;
    best.path = [];
    best.pathGoal = null;
    this.stats.stuns++;
    this.events.push({ type: 'stun', x: best.x, y: best.y });
    this.log(`> static_shock -> ${best.name}: STUNNED (${CFG.stun.duration}s)`, 'good');
    this.emitNoise(best.x, best.y, CFG.stun.noiseRadius, best);
  }

  private updateHack(dt: number, holding: boolean): void {
    const p = this.player;
    if (!holding) {
      p.hackLatch = false;
      if (p.hack) this.log(`> hack of ${this.targetLabel(p.hack.target)} interrupted.`, 'warn');
      p.hack = null;
      return;
    }
    if (p.hackLatch) return;
    if (p.inVent) {
      p.hack = null;
      return;
    }
    const target = p.hack?.target ?? this.findHackTarget();
    if (!target || !this.targetAvailable(target) || dist(p, this.targetPos(target)) > CFG.hack.range) {
      if (p.hack) this.log(`> hack of ${this.targetLabel(p.hack.target)} interrupted.`, 'warn');
      p.hack = null;
      return;
    }
    if (!p.hack) {
      const duration =
        target.kind === 'camera' ? CFG.hack.duration.camera : CFG.hack.duration[this.terminals[target.id]!.kind];
      p.hack = { target, progress: 0, duration, noiseTimer: 0 };
      this.log(`> hacking ${this.targetLabel(target)}...`, 'info');
    }
    p.hack.progress += dt;
    p.hack.noiseTimer += dt;
    if (p.hack.noiseTimer >= CFG.hack.noiseEvery) {
      p.hack.noiseTimer = 0;
      this.emitNoise(p.x, p.y, CFG.hack.noiseRadius);
    }
    if (p.hack.progress >= p.hack.duration) {
      this.completeHack(p.hack.target);
      p.hack = null;
      p.hackLatch = true;
    }
  }

  private completeHack(target: HackTarget): void {
    const p = this.player;
    this.stats.hacks++;
    if (target.kind === 'camera') {
      const cam = this.cameras[target.id]!;
      cam.disabled = true;
      cam.seesPlayer = false;
      p.data += CFG.hack.reward.camera;
      this.log(`> ${cam.name} disabled. +${CFG.hack.reward.camera} DATA`, 'good');
      return;
    }
    const t = this.terminals[target.id]!;
    t.hacked = true;
    p.data += CFG.hack.reward[t.kind];
    if (t.kind === 'security') {
      this.grid.exitOpen = true;
      this.objective = 'Reach the EXIT (east lobby)';
      this.log(`> SECURITY OVERRIDE. Exit door unlocked. +${CFG.hack.reward.security} DATA`, 'good');
    } else {
      this.log(`> data cache extracted. +${CFG.hack.reward.data} DATA`, 'good');
    }
  }

  private findHackTarget(): HackTarget | null {
    const p = this.player;
    let best: HackTarget | null = null;
    let bestD: number = CFG.hack.range;
    for (const t of this.terminals) {
      const d = dist(p, center(t));
      if (!t.hacked && d <= bestD) {
        best = { kind: 'terminal', id: t.id };
        bestD = d;
      }
    }
    for (const c of this.cameras) {
      const d = dist(p, c);
      if (!c.disabled && d <= bestD) {
        best = { kind: 'camera', id: c.id };
        bestD = d;
      }
    }
    return best;
  }

  private targetPos(t: HackTarget): Vec {
    return t.kind === 'camera' ? this.cameras[t.id]! : center(this.terminals[t.id]!);
  }

  private targetAvailable(t: HackTarget): boolean {
    return t.kind === 'camera' ? !this.cameras[t.id]!.disabled : !this.terminals[t.id]!.hacked;
  }

  private targetLabel(t: HackTarget): string {
    if (t.kind === 'camera') return this.cameras[t.id]!.name;
    return this.terminals[t.id]!.kind === 'security' ? 'SECURITY TERMINAL' : 'DATA TERMINAL';
  }

  // ── Detection ───────────────────────────────────────────────────────────

  private seeRate(d: number, range: number): number {
    const base = 0.6 + 2.0 * Math.max(0, 1 - d / range);
    return base * (this.player.sneaking ? 0.6 : 1) * (1 + (this.threat - 1) * 0.1);
  }

  private updateCameras(dt: number): void {
    const p = this.player;
    for (const cam of this.cameras) {
      if (cam.disabled) continue;
      cam.facing = cam.baseFacing + Math.sin(this.time * cam.speed + cam.phase) * cam.sweep;
      if (cam.cooldown > 0) {
        cam.cooldown -= dt;
        cam.seesPlayer = false;
        continue;
      }
      cam.seesPlayer = !p.inVent && inCone(this.grid, cam, cam.facing, CFG.camera.fov, CFG.camera.range, p);
      if (cam.seesPlayer) {
        cam.suspicion = Math.min(1, cam.suspicion + this.seeRate(dist(cam, p), CFG.camera.range) * dt);
      } else {
        cam.suspicion = Math.max(0, cam.suspicion - CFG.guard.suspicionDecay * dt);
      }
      if (cam.suspicion >= 1) {
        cam.suspicion = 0;
        cam.cooldown = CFG.camera.cooldown;
        this.stats.alarms++;
        this.log(`> ${cam.name}: ALARM. Units converging on your position.`, 'danger');
        this.raiseThreat();
        for (const g of this.guards) {
          if (g.state === 'stunned' || g.state === 'alert') continue;
          if (dist(g, p) <= CFG.camera.alarmRadius) {
            g.suspicion = Math.max(g.suspicion, 0.5);
            this.investigate(g, { x: p.x, y: p.y });
          }
        }
      }
    }
  }

  private guardSees(g: Guard): boolean {
    const p = this.player;
    if (p.inVent) return false;
    if (dist(g, p) < CFG.guard.touchRange) return true;
    return inCone(this.grid, g, g.facing, CFG.guard.fov, CFG.guard.range, p);
  }

  private updateGuards(dt: number): void {
    const p = this.player;
    const speedMul = 1 + (this.threat - 1) * 0.06;
    for (const g of this.guards) {
      if (g.state === 'stunned') {
        g.stunTimer -= dt;
        if (g.stunTimer <= 0) {
          g.suspicion = 0.5;
          this.investigate(g, { x: g.x, y: g.y });
          this.bark(g, '"...what hit me?"', 'warn', true);
        }
        continue;
      }

      const sees = this.guardSees(g);
      g.seesPlayer = sees;
      if (sees) {
        g.suspicion = Math.min(1, g.suspicion + this.seeRate(dist(g, p), CFG.guard.range) * dt);
        g.lastSeen = { x: p.x, y: p.y };
        g.lostSight = 0;
      } else if (g.state !== 'alert') {
        g.suspicion = Math.max(0, g.suspicion - CFG.guard.suspicionDecay * dt);
      }
      if (g.state !== 'alert' && g.suspicion >= 1) this.goAlert(g);

      switch (g.state) {
        case 'patrol':
          if (sees && g.suspicion >= CFG.guard.suspiciousAt) {
            g.state = 'suspicious';
            g.timer = 0;
            this.bark(g, '"Huh? Is something there?"', 'warn');
          } else {
            this.patrolStep(g, dt, speedMul);
          }
          break;
        case 'suspicious':
          this.turnTowards(g, Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x), dt);
          if (sees) {
            g.timer = 0;
          } else {
            g.timer += dt;
            if (g.timer > 1.2) this.investigate(g, g.lastSeen);
          }
          break;
        case 'investigate':
          if (sees && g.suspicion >= CFG.guard.suspiciousAt) {
            g.state = 'suspicious';
            g.timer = 0;
          } else if (!g.arrived) {
            if (this.moveGuardTo(g, g.target, CFG.guard.investigateSpeed * speedMul, dt)) {
              g.arrived = true;
              g.timer = 0;
              g.lookBase = g.facing;
            }
          } else {
            g.timer += dt;
            this.turnTowards(g, g.lookBase + Math.sin(g.timer * 2.2) * 1.3, dt);
            if (g.timer >= CFG.guard.lookAroundTime) {
              g.state = 'patrol';
              g.pathGoal = null;
            }
          }
          break;
        case 'alert': {
          const speed = CFG.guard.alertSpeed * speedMul;
          if (sees) {
            const d = dist(g, p);
            if (d > CFG.guard.zapRange * 0.8) {
              const step = Math.min(speed * dt, d - CFG.guard.zapRange * 0.8);
              const a = Math.atan2(p.y - g.y, p.x - g.x);
              g.x += Math.cos(a) * step;
              g.y += Math.sin(a) * step;
              g.pathGoal = null;
            }
            this.turnTowards(g, Math.atan2(p.y - g.y, p.x - g.x), dt);
            if (d <= CFG.guard.zapRange) {
              p.power -= CFG.guard.zapDps * dt;
              if (Math.floor(this.time * 4) !== Math.floor((this.time - dt) * 4)) {
                this.events.push({ type: 'zap', x: p.x, y: p.y });
              }
            }
          } else {
            g.lostSight += dt;
            this.moveGuardTo(g, g.lastSeen, speed, dt);
            if (g.lostSight >= CFG.guard.loseSightAfter) {
              g.suspicion = 0.6;
              this.investigate(g, g.lastSeen);
              this.bark(g, '"Lost it. Search the area!"', 'warn', true);
            }
          }
          break;
        }
      }
    }
  }

  private goAlert(g: Guard): void {
    g.state = 'alert';
    g.suspicion = 1;
    g.lostSight = 0;
    g.pathGoal = null;
    this.stats.detections++;
    this.bark(g, '"THERE IT IS! Rogue unit spotted!"', 'danger', true);
    this.raiseThreat();
    for (const other of this.guards) {
      if (other === g || other.state === 'stunned' || other.state === 'alert') continue;
      if (dist(other, g) <= CFG.guard.broadcastRadius) {
        other.suspicion = Math.max(other.suspicion, 0.5);
        this.investigate(other, { ...g.lastSeen });
      }
    }
  }

  private investigate(g: Guard, point: Vec): void {
    g.state = 'investigate';
    g.target = this.nearestGuardTile(point);
    g.arrived = false;
    g.pathGoal = null;
    g.timer = 0;
  }

  private patrolStep(g: Guard, dt: number, speedMul: number): void {
    const wp = center(g.route[g.routeIndex]!);
    if (g.sentry) {
      if (dist(g, wp) > 0.1) {
        this.moveGuardTo(g, wp, CFG.guard.patrolSpeed * speedMul, dt);
      } else {
        this.turnTowards(g, g.postFacing + Math.sin(this.time * 0.8 + g.id) * 1.0, dt);
      }
      return;
    }
    if (this.moveGuardTo(g, wp, CFG.guard.patrolSpeed * speedMul, dt)) {
      g.routeIndex = (g.routeIndex + 1) % g.route.length;
      g.pathGoal = null;
    }
  }

  /** Moves a guard along an A* path towards `goal`. Returns true once it has arrived. */
  private moveGuardTo(g: Guard, goal: Vec, speed: number, dt: number): boolean {
    const gx = Math.floor(goal.x);
    const gy = Math.floor(goal.y);
    if (!g.pathGoal || Math.floor(g.pathGoal.x) !== gx || Math.floor(g.pathGoal.y) !== gy) {
      const found = findPath(this.grid, g, goal, 'guard');
      g.path = found ?? [];
      g.pathFailed = found === null;
      g.pathGoal = { x: goal.x, y: goal.y };
    }
    if (g.pathFailed) return true;
    let budget = speed * dt;
    while (budget > 0) {
      const next = g.path.length > 0 ? center(g.path[0]!) : goal;
      const d = dist(g, next);
      if (d < 0.001) {
        if (g.path.length === 0) return true;
        g.path.shift();
        continue;
      }
      const a = Math.atan2(next.y - g.y, next.x - g.x);
      this.turnTowards(g, a, dt);
      const step = Math.min(budget, d);
      g.x += Math.cos(a) * step;
      g.y += Math.sin(a) * step;
      budget -= step;
      if (step === d) {
        if (g.path.length === 0) return true;
        g.path.shift();
      }
    }
    return false;
  }

  private nearestGuardTile(p: Vec): Vec {
    const px = Math.floor(p.x);
    const py = Math.floor(p.y);
    for (let r = 0; r <= 4; r++) {
      let best: Vec | null = null;
      let bestD = Infinity;
      for (let y = py - r; y <= py + r; y++) {
        for (let x = px - r; x <= px + r; x++) {
          if (!this.grid.walkable(x, y, 'guard')) continue;
          const d = Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y);
          if (d < bestD) {
            bestD = d;
            best = { x: x + 0.5, y: y + 0.5 };
          }
        }
      }
      if (best) return best;
    }
    return { x: p.x, y: p.y };
  }

  private turnTowards(g: Guard, angle: number, dt: number): void {
    const d = angleDiff(g.facing, angle);
    const step = CFG.guard.turnRate * dt;
    g.facing += Math.max(-step, Math.min(step, d));
  }

  // ── Noise, threat, visibility ───────────────────────────────────────────

  private emitNoise(x: number, y: number, r: number, exclude?: Guard): void {
    this.events.push({ type: 'noise', x, y, r });
    for (const g of this.guards) {
      if (g === exclude || g.state === 'stunned' || g.state === 'alert') continue;
      const d = Math.hypot(g.x - x, g.y - y);
      const effective = clearPath(this.grid, g.x, g.y, x, y) ? r : r * 0.5;
      if (d > effective) continue;
      g.suspicion = Math.max(g.suspicion, 0.3);
      this.investigate(g, { x, y });
      this.bark(g, '"What was that noise?"', 'warn');
    }
  }

  private raiseThreat(): void {
    this.threatCalm = 0;
    if (this.threatCooldown > 0 || this.threat >= CFG.threat.max) return;
    this.threat++;
    this.threatCooldown = CFG.threat.raiseCooldown;
    this.log(`> THREAT LEVEL ${this.threat}`, 'danger');
  }

  private updateThreat(dt: number): void {
    this.threatCooldown = Math.max(0, this.threatCooldown - dt);
    if (this.guards.some((g) => g.state === 'alert')) {
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
    const key = `${Math.floor(p.x * 4)},${Math.floor(p.y * 4)}`;
    if (key === this.visKey) return;
    this.visKey = key;
    this.visible = computeVisible(this.grid, p.x, p.y, CFG.player.sensorRadius);
    for (let i = 0; i < this.visible.length; i++) if (this.visible[i]) this.explored[i] = 1;
  }

  private bark(g: Guard, text: string, level: LogLevel, force = false): void {
    if (!force && this.time - g.lastBark < 3) return;
    g.lastBark = this.time;
    this.log(`> ${g.name}: ${text}`, level);
  }

  private log(text: string, level: LogLevel): void {
    this.events.push({ type: 'log', text, level });
  }
}
