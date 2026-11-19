import { CFG } from '../config';
import { TILE } from '../grid';
import { moveCircle } from '../movement';
import { POUNCE } from '../versions';
import { center, dist, type Input, type World } from '../world';
import { rank } from '../upgrades';
import { landPounce } from './actions';
import { damageGuard, stunGuard } from './guards';

/** Movement, facing, hazards, footstep noise and Power regeneration. */
export function updatePlayer(w: World, dt: number, input: Input): void {
  const p = w.player;
  const v = p.version;
  p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.sneaking = input.sneak;

  let mx = input.moveX;
  let my = input.moveY;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  if (input.dash && !p.dash && !p.pounce && p.dashCooldown <= 0 && !p.interact) startDash(w, mx, my);

  if (p.dash) {
    const k = Math.min(dt, CFG.dash.duration - p.dash.t) / CFG.dash.duration;
    moveCircle(w.grid, p, p.dash.dx * k, p.dash.dy * k, v.radius, w.mover);
    p.dash.t += dt;
    p.moving = true;
    arcDash(w);
    if (p.dash.t >= CFG.dash.duration) p.dash = null;
  } else if (p.pounce) {
    const k = Math.min(dt, POUNCE.duration - p.pounce.t) / POUNCE.duration;
    moveCircle(w.grid, p, p.pounce.dx * k, p.pounce.dy * k, v.radius, w.mover);
    p.pounce.t += dt;
    p.moving = true;
    if (p.pounce.t >= POUNCE.duration) {
      p.pounce = null;
      landPounce(w);
    }
  } else {
    const speed = (input.sneak ? v.sneakSpeed : v.speed) * (1 + p.build.mods.speed);
    const moved = moveCircle(w.grid, p, mx * speed * dt, my * speed * dt, v.radius, w.mover);
    p.moving = moved > 0.0001;
  }

  if (input.aim) p.facing = Math.atan2(input.aim.y - p.y, input.aim.x - p.x);
  else if (!p.pounce && !p.dash && len > 0.1) p.facing = Math.atan2(my, mx);

  const tile = w.grid.get(Math.floor(p.x), Math.floor(p.y));
  p.inVent = tile === TILE.VENT;
  p.inWater = tile === TILE.WATER;
  if (tile === TILE.EXIT) {
    w.reachExit();
    return;
  }

  const noise = !p.moving
    ? 0
    : p.inWater
      ? p.sneaking
        ? CFG.water.sneakNoiseRadius
        : CFG.water.noiseRadius
      : p.sneaking
        ? 0
        : p.inVent
          ? CFG.player.ventNoiseRadius
          : CFG.player.stepNoiseRadius;
  if (noise > 0) {
    p.stepTimer += dt;
    if (p.stepTimer >= CFG.player.stepNoiseEvery) {
      p.stepTimer = 0;
      w.emitNoise(p.x, p.y, noise * (1 - p.build.mods.quiet));
    }
  } else {
    p.stepTimer = 0;
  }

  p.charging = !p.inVent && w.outlets.some((o) => dist(p, center(o)) <= CFG.outlet.range);
  if (p.charging) p.power += CFG.outlet.rate * dt;
  else if (!w.anyAlert()) p.power += v.regen * (1 + p.build.mods.regen) * dt;
  if (p.inWater) p.power -= CFG.water.drain * dt;
  p.power = Math.min(w.maxPower, p.power);
}

/** Dash in the move direction (or facing, when standing still). Costs a little Power and makes some noise. */
function startDash(w: World, mx: number, my: number): void {
  const p = w.player;
  if (p.power <= CFG.dash.cost) return;
  const len = Math.hypot(mx, my);
  const a = len > 0.1 ? Math.atan2(my, mx) : p.facing;
  p.power -= CFG.dash.cost;
  const phase = rank(w, 'phase_dash');
  p.dashCooldown = CFG.dash.cooldown * (1 - 0.2 * phase) * (1 - p.build.mods.cooldown);
  const reach = CFG.dash.distance + 0.4 * phase;
  p.dash = { dx: Math.cos(a) * reach, dy: Math.sin(a) * reach, t: 0, hit: [] };
  w.emit({ type: 'dash', x: p.x, y: p.y, facing: a });
  if (!p.inVent) w.emitNoise(p.x, p.y, CFG.dash.noiseRadius * (1 - p.build.mods.quiet));
}

/** ARC DASH card: enemies ECHO dashes through are stunned; drones short out. */
function arcDash(w: World): void {
  const p = w.player;
  const r = rank(w, 'shock_dash');
  if (!p.dash || r === 0) return;
  for (const g of w.guards) {
    if (g.state === 'down' || p.dash.hit.includes(g.id) || dist(p, g) > 0.75) continue;
    p.dash.hit.push(g.id);
    if (g.kind === 'drone') damageGuard(w, g, 1);
    else stunGuard(g, 0.8 * r * (1 + p.build.mods.stun));
    w.emit({ type: 'stun', x: g.x, y: g.y });
  }
}

/** Power damage to ECHO from bullets and tasers; HARDENED PLATING reduces it. */
export function hurtPlayer(w: World, amount: number): number {
  const taken = amount * (1 - 0.15 * rank(w, 'plating'));
  w.player.power -= taken;
  w.player.hitFlash = 0.2;
  return taken;
}

/** True while ECHO is mid-dash and cannot be hit. */
export function dodging(w: World): boolean {
  return !!w.player.dash;
}
