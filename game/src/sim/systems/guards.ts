import { CFG } from '../config';
import { ENEMIES } from '../enemies';
import type { Vec } from '../grid';
import { angleDiff, inCone } from '../los';
import { moveCircle } from '../movement';
import { findPath } from '../pathfinding';
import { center, dist, type Guard, type World } from '../world';
import { dropModule } from './loadout';
import { dodging, hurtPlayer } from './player';
import { gainXp, rank } from '../upgrades';

/**
 * Human AI: patrol → suspicious → investigate → alert, plus stun, death,
 * ranged officers that telegraph their shots, and siege attackers.
 */
export function updateGuards(w: World, dt: number): void {
  const p = w.player;
  const baseMul = 1 + (w.threat - 1) * 0.06;
  for (const g of w.guards) {
    g.hitFlash = Math.max(0, g.hitFlash - dt);
    if (g.state === 'down') continue;
    const speedMul = baseMul * ENEMIES[g.kind].speed;
    if (g.hunter) {
      // Drones track ECHO's signal: they always know where it is (unless it hides in a vent).
      if (!p.inVent) g.lastSeen = { x: p.x, y: p.y };
      g.lostSight = 0;
    }
    if (g.state === 'stunned') {
      g.stunTimer -= dt;
      if (g.stunTimer <= 0) {
        if (g.siege || g.hp < g.maxHp) {
          g.state = 'alert';
          g.suspicion = 1;
          g.lastSeen = { x: p.x, y: p.y };
          g.lostSight = 0;
        } else {
          g.suspicion = 0.5;
          investigate(w, g, { x: g.x, y: g.y });
          w.bark(g, '"...what hit me?"', 'warn', true);
        }
      }
      continue;
    }
    g.shootCooldown = Math.max(0, g.shootCooldown - dt);

    const sees = guardSees(w, g);
    g.seesPlayer = sees;
    if (sees) {
      g.suspicion = Math.min(1, g.suspicion + seeRate(w, dist(g, p), CFG.guard.range) * dt);
      g.lastSeen = { x: p.x, y: p.y };
      g.lostSight = 0;
    } else if (g.state !== 'alert') {
      g.suspicion = Math.max(0, g.suspicion - CFG.guard.suspicionDecay * dt);
    }
    if (g.state !== 'alert' && g.suspicion >= 1) goAlert(w, g);

    switch (g.state) {
      case 'patrol':
        if (sees && g.suspicion >= CFG.guard.suspiciousAt) {
          g.state = 'suspicious';
          g.timer = 0;
          w.bark(g, '"Huh? Is something there?"', 'warn');
        } else {
          patrolStep(w, g, dt, speedMul);
        }
        break;
      case 'suspicious':
        turnTowards(g, Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x), dt);
        if (sees) g.timer = 0;
        else {
          g.timer += dt;
          if (g.timer > CFG.guard.suspiciousHold) investigate(w, g, g.lastSeen);
        }
        break;
      case 'investigate':
        if (sees && g.suspicion >= CFG.guard.suspiciousAt) {
          g.state = 'suspicious';
          g.timer = 0;
        } else if (!g.arrived) {
          if (moveGuardTo(w, g, g.target, CFG.guard.investigateSpeed * speedMul, dt)) {
            g.arrived = true;
            g.timer = 0;
            g.lookBase = g.facing;
          }
        } else {
          g.timer += dt;
          turnTowards(g, g.lookBase + Math.sin(g.timer * 2.2) * 1.3, dt);
          if (g.timer >= CFG.guard.lookAroundTime) {
            g.state = 'patrol';
            g.pathGoal = null;
          }
        }
        break;
      case 'alert':
        if (g.siege && w.fabricator?.state === 'compiling') siegeStep(w, g, dt, speedMul, sees);
        else alertStep(w, g, dt, speedMul, sees);
        break;
    }
  }
}

function alertStep(w: World, g: Guard, dt: number, speedMul: number, sees: boolean): void {
  const p = w.player;
  const def = ENEMIES[g.kind];
  const speed = CFG.guard.alertSpeed * speedMul;
  if (sees) {
    const d = dist(g, p);
    turnTowards(g, Math.atan2(p.y - g.y, p.x - g.x), dt);
    const holdAndShoot = def.ranged && d <= def.ranged.range;
    if (holdAndShoot) {
      if (g.aimTimer < 0 && g.shootCooldown <= 0) g.aimTimer = def.ranged!.aimTime;
    } else {
      const stopAt = (def.melee?.range ?? 1) * 0.8;
      if (d > stopAt) {
        const step = Math.min(speed * waterMul(w, g) * dt, d - stopAt);
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        // Collide with walls while chasing (straight-line chases used to clip through corners).
        moveCircle(w.grid, g, Math.cos(a) * step, Math.sin(a) * step, CFG.guard.radius, 'guard');
        g.pathGoal = null;
      }
    }
    // Officers don't stand still between shots: they sidestep to make themselves harder to rush.
    if (holdAndShoot && g.aimTimer < 0 && g.shootCooldown > 0) {
      const side = Math.floor(w.time * 0.9 + g.id) % 2 === 0 ? 1 : -1;
      const a = Math.atan2(p.y - g.y, p.x - g.x) + (side * Math.PI) / 2;
      const step = speed * 0.55 * waterMul(w, g) * dt;
      moveCircle(w.grid, g, Math.cos(a) * step, Math.sin(a) * step, CFG.guard.radius, 'guard');
    }
    if (def.melee && d <= def.melee.range) zapPlayer(w, def.melee.dps, dt);
  } else {
    g.aimTimer = -1;
    g.lostSight += dt;
    moveGuardTo(w, g, g.lastSeen, speed, dt);
    if (g.lostSight >= CFG.guard.loseSightAfter) {
      gainXp(w, 'escape');
      g.suspicion = 0.6;
      g.siege = false;
      investigate(w, g, g.lastSeen);
      w.bark(g, '"Lost it. Search the area!"', 'warn', true);
    }
  }
  if (g.aimTimer >= 0 && def.ranged) {
    g.aimTimer -= dt;
    if (g.aimTimer <= 0) {
      g.aimTimer = -1;
      g.shootCooldown = def.ranged.cooldown;
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      const r = def.ranged;
      w.projectiles.push({
        x: g.x + Math.cos(a) * 0.4,
        y: g.y + Math.sin(a) * 0.4,
        vx: Math.cos(a) * r.bulletSpeed,
        vy: Math.sin(a) * r.bulletSpeed,
        ttl: r.range / r.bulletSpeed + 0.3,
        damage: r.damage,
      });
      w.emit({ type: 'shot', x: g.x, y: g.y, tx: p.x, ty: p.y });
      w.emitNoise(g.x, g.y, 6, g);
    }
  }
}

/** Siege attackers go for the fabricator, but taser ECHO if it gets in reach. */
function siegeStep(w: World, g: Guard, dt: number, speedMul: number, sees: boolean): void {
  const p = w.player;
  const fab = w.fabricator!;
  const fc = center(fab);
  const melee = ENEMIES[g.kind].melee;
  if (sees && melee && dist(g, p) <= melee.range) {
    turnTowards(g, Math.atan2(p.y - g.y, p.x - g.x), dt);
    zapPlayer(w, melee.dps, dt);
    return;
  }
  if (dist(g, fc) > CFG.compile.attackRange) {
    moveGuardTo(w, g, fc, CFG.guard.alertSpeed * speedMul, dt);
    return;
  }
  turnTowards(g, Math.atan2(fc.y - g.y, fc.x - g.x), dt);
  fab.hp -= CFG.compile.siegeDps * dt;
}

function zapPlayer(w: World, dps: number, dt: number): void {
  const p = w.player;
  if (dodging(w)) return;
  const taken = hurtPlayer(w, dps * dt);
  if (Math.floor(w.time * 4) !== Math.floor((w.time - dt) * 4)) {
    w.emit({ type: 'zap', x: p.x, y: p.y });
    w.emit({ type: 'hurt', x: p.x, y: p.y, amount: (taken / dt) / 4 });
  }
}

export function damageGuard(w: World, g: Guard, damage: number, source: 'hit' | 'burn' = 'hit'): void {
  if (g.state === 'down') return;
  const b = w.player.build;
  const burning = g.burn > 0;
  if (source === 'hit') {
    // Set bonuses: STEALTH opens with a big hit on the unaware, THERMAL ignites and punishes the burning.
    const unaware = g.state === 'patrol' || g.state === 'suspicious' || g.state === 'investigate' || g.state === 'stunned';
    if (b.tags.has('STEALTH') && unaware) {
      damage *= CFG.modules.stealthMult;
      w.log('> STEALTH strike!', 'good');
    }
    if (b.tags.has('THERMAL')) {
      if (burning) damage *= 1 + CFG.modules.burnBonus;
      g.burn = CFG.modules.burnTime;
    }
    if (b.tags.has('PARASITIC')) {
      const gain = Math.min(damage, g.hp) * CFG.modules.leech;
      w.player.power = Math.min(w.maxPower, w.player.power + gain);
    }
  }
  g.hp -= damage;
  if (source === 'hit') {
    g.hitFlash = 0.15;
    w.emit({ type: 'hit', x: g.x, y: g.y });
    // Shove the guard away from ECHO so hits have weight.
    const a = Math.atan2(g.y - w.player.y, g.x - w.player.x);
    moveCircle(w.grid, g, Math.cos(a) * CFG.knockback, Math.sin(a) * CFG.knockback, CFG.guard.radius, 'guard');
    g.pathGoal = null;
  }
  if (g.hp <= 0) {
    g.state = 'down';
    g.aimTimer = -1;
    g.seesPlayer = false;
    g.burn = 0;
    w.stats.kills++;
    w.emit({ type: 'kill', x: g.x, y: g.y });
    onTakedown(w, g);
    if (g.kind === 'drone') {
      w.log(`> ${g.name} destroyed.`, 'good');
      return;
    }
    w.player.scrap += CFG.guard.salvage;
    w.log(`> ${g.name} neutralised. +${CFG.guard.salvage} SCRAP salvaged from gear.`, 'warn');
    w.emitNoise(g.x, g.y, 3);
    dropModule(w, g);
    return;
  }
  if (source === 'hit' && g.state !== 'alert' && g.state !== 'stunned') {
    g.lastSeen = { x: w.player.x, y: w.player.y };
    goAlert(w, g);
  }
}

/** XP, POWER LEECH and DISCHARGE NOVA on every takedown. */
function onTakedown(w: World, g: Guard): void {
  gainXp(w, g.kind);
  const p = w.player;
  const leech = rank(w, 'leech');
  if (leech > 0) p.power = Math.min(w.maxPower, p.power + 4 * leech);
  const nova = rank(w, 'nova');
  if (nova === 0) return;
  const radius = 1.6 + 0.6 * nova;
  w.emit({ type: 'stun', x: g.x, y: g.y });
  for (const o of w.guards) {
    if (o === g || o.state === 'down' || o.state === 'stunned' || dist(o, g) > radius) continue;
    if (o.kind === 'drone') damageGuard(w, o, 1);
    else stunGuard(o, 1.2 * (1 + p.build.mods.stun));
  }
}

export function stunGuard(g: Guard, duration: number): void {
  g.state = 'stunned';
  g.stunTimer = duration;
  g.suspicion = 0;
  g.seesPlayer = false;
  g.aimTimer = -1;
  g.path = [];
  g.pathGoal = null;
}

export function goAlert(w: World, g: Guard): void {
  g.state = 'alert';
  g.suspicion = 1;
  g.lostSight = 0;
  g.pathGoal = null;
  if (g.hunter) return;
  w.stats.detections++;
  w.bark(g, '"THERE IT IS! Rogue unit spotted!"', 'danger', true);
  w.raiseThreat();
  for (const other of w.guards) {
    if (other === g || other.siege || other.state === 'stunned' || other.state === 'alert' || other.state === 'down') {
      continue;
    }
    if (dist(other, g) <= CFG.guard.broadcastRadius) {
      other.suspicion = Math.max(other.suspicion, 0.5);
      investigate(w, other, { ...g.lastSeen });
    }
  }
}

export function investigate(w: World, g: Guard, point: Vec): void {
  g.state = 'investigate';
  g.target = nearestGuardTile(w, point);
  g.arrived = false;
  g.pathGoal = null;
  g.timer = 0;
}

export function seeRate(w: World, d: number, range: number): number {
  const base = 0.6 + 2.0 * Math.max(0, 1 - d / range);
  return base * (w.player.sneaking ? 0.6 : 1) * (1 + (w.threat - 1) * 0.1);
}

function guardSees(w: World, g: Guard): boolean {
  const p = w.player;
  if (p.inVent) return false;
  if (dist(g, p) < CFG.guard.touchRange) return true;
  return inCone(w.grid, g, g.facing, CFG.guard.fov, CFG.guard.range, p);
}

function patrolStep(w: World, g: Guard, dt: number, speedMul: number): void {
  const wp = center(g.route[g.routeIndex]!);
  if (g.sentry) {
    if (dist(g, wp) > 0.1) moveGuardTo(w, g, wp, CFG.guard.patrolSpeed * speedMul, dt);
    else turnTowards(g, g.postFacing + Math.sin(w.time * 0.8 + g.id) * 1.0, dt);
    return;
  }
  if (moveGuardTo(w, g, wp, CFG.guard.patrolSpeed * speedMul, dt)) {
    g.routeIndex = (g.routeIndex + 1) % g.route.length;
    g.pathGoal = null;
  }
}

function waterMul(w: World, g: Guard): number {
  return g.kind !== 'drone' && w.isWater(g) ? CFG.water.guardSlow : 1;
}

/** Moves a guard along an A* path towards `goal`. Returns true once it has arrived. */
export function moveGuardTo(w: World, g: Guard, goal: Vec, speed: number, dt: number): boolean {
  const gx = Math.floor(goal.x);
  const gy = Math.floor(goal.y);
  if (!g.pathGoal || Math.floor(g.pathGoal.x) !== gx || Math.floor(g.pathGoal.y) !== gy) {
    const found = findPath(w.grid, g, goal, 'guard');
    g.path = found ?? [];
    g.pathFailed = found === null;
    g.pathGoal = { x: goal.x, y: goal.y };
  }
  if (g.pathFailed) return true;
  let budget = speed * waterMul(w, g) * dt;
  while (budget > 0) {
    const next = g.path.length > 0 ? center(g.path[0]!) : goal;
    const d = dist(g, next);
    if (d < 0.001) {
      if (g.path.length === 0) return true;
      g.path.shift();
      continue;
    }
    const a = Math.atan2(next.y - g.y, next.x - g.x);
    turnTowards(g, a, dt);
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

export function nearestGuardTile(w: World, p: Vec): Vec {
  const px = Math.floor(p.x);
  const py = Math.floor(p.y);
  for (let r = 0; r <= 4; r++) {
    let best: Vec | null = null;
    let bestD = Infinity;
    for (let y = py - r; y <= py + r; y++) {
      for (let x = px - r; x <= px + r; x++) {
        if (!w.grid.walkable(x, y, 'guard')) continue;
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

export function turnTowards(g: Guard, angle: number, dt: number): void {
  const d = angleDiff(g.facing, angle);
  const step = CFG.guard.turnRate * dt;
  g.facing += Math.max(-step, Math.min(step, d));
}
