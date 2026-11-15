import { CFG } from '../config';
import { TILE } from '../grid';
import { moveCircle } from '../movement';
import { POUNCE } from '../versions';
import { center, dist, type Input, type World } from '../world';
import { landPounce } from './actions';

/** Movement, facing, hazards, footstep noise and Power regeneration. */
export function updatePlayer(w: World, dt: number, input: Input): void {
  const p = w.player;
  const v = p.version;
  p.abilityCooldown = Math.max(0, p.abilityCooldown - dt);
  p.attackCooldown = Math.max(0, p.attackCooldown - dt);
  p.hitFlash = Math.max(0, p.hitFlash - dt);
  p.sneaking = input.sneak;

  let mx = input.moveX;
  let my = input.moveY;
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }

  if (p.pounce) {
    const k = Math.min(dt, POUNCE.duration - p.pounce.t) / POUNCE.duration;
    moveCircle(w.grid, p, p.pounce.dx * k, p.pounce.dy * k, v.radius, w.mover);
    p.pounce.t += dt;
    p.moving = true;
    if (p.pounce.t >= POUNCE.duration) {
      p.pounce = null;
      landPounce(w);
    }
  } else {
    const speed = input.sneak ? v.sneakSpeed : v.speed;
    const moved = moveCircle(w.grid, p, mx * speed * dt, my * speed * dt, v.radius, w.mover);
    p.moving = moved > 0.0001;
  }

  if (input.aim) p.facing = Math.atan2(input.aim.y - p.y, input.aim.x - p.x);
  else if (!p.pounce && len > 0.1) p.facing = Math.atan2(my, mx);

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
      w.emitNoise(p.x, p.y, noise);
    }
  } else {
    p.stepTimer = 0;
  }

  p.charging = !p.inVent && w.outlets.some((o) => dist(p, center(o)) <= CFG.outlet.range);
  if (p.charging) p.power += CFG.outlet.rate * dt;
  else if (!w.anyAlert()) p.power += v.regen * dt;
  if (p.inWater) p.power -= CFG.water.drain * dt;
  p.power = Math.min(v.maxPower, p.power);
}
