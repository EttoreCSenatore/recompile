import type { Grid, Vec } from './grid';

/**
 * Walks the grid cells crossed by the segment a→b (Amanatides–Woo DDA).
 * Returns true if no opaque cell lies strictly between the start cell and the target cell.
 */
export function clearPath(grid: Grid, ax: number, ay: number, bx: number, by: number): boolean {
  let x = Math.floor(ax);
  let y = Math.floor(ay);
  const tx = Math.floor(bx);
  const ty = Math.floor(by);
  const dx = bx - ax;
  const dy = by - ay;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  let tMaxX = stepX > 0 ? (x + 1 - ax) / dx : stepX < 0 ? (ax - x) / -dx : Infinity;
  let tMaxY = stepY > 0 ? (y + 1 - ay) / dy : stepY < 0 ? (ay - y) / -dy : Infinity;

  for (let guard = 0; (x !== tx || y !== ty) && guard < 1024; guard++) {
    if (tMaxX < tMaxY) {
      x += stepX;
      tMaxX += tDeltaX;
    } else {
      y += stepY;
      tMaxY += tDeltaY;
    }
    if (x === tx && y === ty) return true;
    if (grid.opaque(x, y)) return false;
  }
  return true;
}

/** Casts a ray and returns the distance to the first opaque cell (capped at maxDist). */
export function castRay(grid: Grid, ox: number, oy: number, angle: number, maxDist: number): number {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let x = Math.floor(ox);
  let y = Math.floor(oy);
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const tDeltaX = stepX !== 0 ? Math.abs(1 / dx) : Infinity;
  const tDeltaY = stepY !== 0 ? Math.abs(1 / dy) : Infinity;
  let tMaxX = stepX > 0 ? (x + 1 - ox) / dx : stepX < 0 ? (ox - x) / -dx : Infinity;
  let tMaxY = stepY > 0 ? (y + 1 - oy) / dy : stepY < 0 ? (oy - y) / -dy : Infinity;

  for (let guard = 0; guard < 1024; guard++) {
    let t: number;
    if (tMaxX < tMaxY) {
      t = tMaxX;
      x += stepX;
      tMaxX += tDeltaX;
    } else {
      t = tMaxY;
      y += stepY;
      tMaxY += tDeltaY;
    }
    if (t >= maxDist) return maxDist;
    if (grid.opaque(x, y)) return t;
  }
  return maxDist;
}

export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** True if `target` is inside the cone (origin, facing, fov, range) with a clear line of sight. */
export function inCone(
  grid: Grid,
  origin: Vec,
  facing: number,
  fov: number,
  range: number,
  target: Vec,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (Math.abs(angleDiff(facing, Math.atan2(dy, dx))) > fov / 2) return false;
  return clearPath(grid, origin.x, origin.y, target.x, target.y);
}

/**
 * Tiles visible from (px, py) within `radius`. Returns a 0/1 mask indexed like the grid.
 * Opaque tiles next to visible floor are revealed too, so walls render cleanly.
 */
export function computeVisible(grid: Grid, px: number, py: number, radius: number): Uint8Array {
  const vis = new Uint8Array(grid.width * grid.height);
  const r = Math.ceil(radius);
  const cx = Math.floor(px);
  const cy = Math.floor(py);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!grid.inBounds(x, y)) continue;
      const tx = x + 0.5;
      const ty = y + 0.5;
      if (Math.hypot(tx - px, ty - py) > radius) continue;
      if (clearPath(grid, px, py, tx, ty)) vis[grid.index(x, y)] = 1;
    }
  }
  if (grid.inBounds(cx, cy)) vis[grid.index(cx, cy)] = 1;
  // Reveal walls bordering visible open tiles.
  const extra: number[] = [];
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      if (!grid.inBounds(x, y) || vis[grid.index(x, y)] || !grid.opaque(x, y)) continue;
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ] as const) {
        if (grid.inBounds(nx, ny) && vis[grid.index(nx, ny)] && !grid.opaque(nx, ny)) {
          extra.push(grid.index(x, y));
          break;
        }
      }
    }
  }
  for (const i of extra) vis[i] = 1;
  return vis;
}
