import type { Grid, Mover, Vec } from './grid';

function collides(grid: Grid, x: number, y: number, r: number, mover: Mover): boolean {
  const x0 = Math.floor(x - r);
  const x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r);
  const y1 = Math.floor(y + r);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (grid.walkable(tx, ty, mover)) continue;
      const cx = Math.max(tx, Math.min(x, tx + 1));
      const cy = Math.max(ty, Math.min(y, ty + 1));
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return true;
    }
  }
  return false;
}

/**
 * Moves a circle through the grid with axis-separated sliding collision.
 * Mutates `pos` and returns the distance actually travelled.
 */
export function moveCircle(grid: Grid, pos: Vec, dx: number, dy: number, r: number, mover: Mover): number {
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return 0;
  const steps = Math.max(1, Math.ceil(dist / 0.1));
  const sx = dx / steps;
  const sy = dy / steps;
  let moved = 0;
  for (let i = 0; i < steps; i++) {
    const ax = tryAxis(grid, pos, sx, 0, r, mover);
    const ay = tryAxis(grid, pos, 0, sy, r, mover);
    moved += ax + ay;
  }
  return moved;
}

/** Moves along one axis; when blocked, halves the step a few times to slide flush against the wall. */
function tryAxis(grid: Grid, pos: Vec, sx: number, sy: number, r: number, mover: Mover): number {
  if (sx === 0 && sy === 0) return 0;
  let fx = sx;
  let fy = sy;
  for (let k = 0; k < 6; k++) {
    if (!collides(grid, pos.x + fx, pos.y + fy, r, mover)) {
      pos.x += fx;
      pos.y += fy;
      return Math.abs(fx) + Math.abs(fy);
    }
    fx /= 2;
    fy /= 2;
  }
  return 0;
}
