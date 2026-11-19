import { CFG } from '../config';
import { dist, type World } from '../world';

/**
 * Hunter drones: once the threat level rises, drones spawn somewhere out of ECHO's sight and home in.
 * They keep the pressure on (and feed XP), and calm down as the threat level decays.
 */
export function updateHunters(w: World, dt: number): void {
  const h = CFG.hunters;
  if (w.threat < h.fromThreat || w.fabricator?.state === 'compiling') {
    w.hunterTimer = Math.min(w.hunterTimer, h.every / 2);
    return;
  }
  const alive = w.guards.filter((g) => g.hunter && g.state !== 'down').length;
  const cap = w.threat - 1;
  if (alive >= cap) return;
  w.hunterTimer -= dt * (1 + (w.threat - h.fromThreat) * 0.35);
  if (w.hunterTimer > 0) return;
  w.hunterTimer = h.every;
  const spot = findSpawn(w);
  if (!spot) return;
  const g = w.addGuard('drone', spot, { hunter: true });
  g.lastSeen = { x: w.player.x, y: w.player.y };
  w.log(`> ${g.name} launched. It is tracking your signal.`, 'danger');
}

/** A walkable tile out of ECHO's sight, at a medium distance. */
function findSpawn(w: World): { x: number; y: number } | null {
  const g = w.grid;
  const p = w.player;
  for (let tries = 0; tries < 60; tries++) {
    const x = Math.floor(w.rng() * g.width);
    const y = Math.floor(w.rng() * g.height);
    if (!g.walkable(x, y, 'guard') || w.visible[g.index(x, y)]) continue;
    const pos = { x: x + 0.5, y: y + 0.5 };
    const d = dist(pos, p);
    if (d >= CFG.hunters.minDist && d <= CFG.hunters.maxDist) return pos;
  }
  return null;
}
