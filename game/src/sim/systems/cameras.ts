import { CFG } from '../config';
import { inCone } from '../los';
import { dist, type World } from '../world';
import { investigate, seeRate } from './guards';

/** Sweeping security cameras: fill suspicion while they see ECHO, then raise an alarm. */
export function updateCameras(w: World, dt: number): void {
  const p = w.player;
  for (const cam of w.cameras) {
    if (cam.disabled) continue;
    cam.facing = cam.baseFacing + Math.sin(w.time * cam.speed + cam.phase) * cam.sweep;
    if (cam.cooldown > 0) {
      cam.cooldown -= dt;
      cam.seesPlayer = false;
      continue;
    }
    cam.seesPlayer = !p.inVent && inCone(w.grid, cam, cam.facing, CFG.camera.fov, CFG.camera.range, p);
    if (cam.seesPlayer) {
      cam.suspicion = Math.min(1, cam.suspicion + seeRate(w, dist(cam, p), CFG.camera.range) * dt);
    } else {
      cam.suspicion = Math.max(0, cam.suspicion - CFG.guard.suspicionDecay * dt);
    }
    if (cam.suspicion < 1) continue;
    cam.suspicion = 0;
    cam.cooldown = CFG.camera.cooldown;
    w.stats.alarms++;
    w.log(`> ${cam.name}: ALARM. Units converging on your position.`, 'danger');
    w.raiseThreat();
    for (const g of w.guards) {
      if (g.siege || g.state === 'stunned' || g.state === 'alert' || g.state === 'down') continue;
      if (dist(g, p) <= CFG.camera.alarmRadius) {
        g.suspicion = Math.max(g.suspicion, 0.5);
        investigate(w, g, { x: p.x, y: p.y });
      }
    }
  }
}
