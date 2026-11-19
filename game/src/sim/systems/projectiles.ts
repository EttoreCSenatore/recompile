import type { World } from '../world';
import { dodging, hurtPlayer } from './player';

const SUBSTEPS = 4;

/** Moves bullets; they stop at walls and vents, and drain Power on hit. */
export function updateProjectiles(w: World, dt: number): void {
  const p = w.player;
  const hitR = p.version.radius + 0.08;
  w.projectiles = w.projectiles.filter((b) => {
    b.ttl -= dt;
    if (b.ttl <= 0) return false;
    for (let i = 0; i < SUBSTEPS; i++) {
      b.x += (b.vx * dt) / SUBSTEPS;
      b.y += (b.vy * dt) / SUBSTEPS;
      if (w.grid.opaque(Math.floor(b.x), Math.floor(b.y))) return false;
      if (!p.inVent && !dodging(w) && Math.hypot(b.x - p.x, b.y - p.y) < hitR) {
        const taken = hurtPlayer(w, b.damage);
        w.emit({ type: 'hurt', x: p.x, y: p.y, amount: taken });
        return false;
      }
    }
    return true;
  });
}
