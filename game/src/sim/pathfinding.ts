import type { Grid, Mover, Vec } from './grid';

/**
 * A* on the tile grid with 8-way movement (no corner cutting).
 * Returns tile coordinates from the first step after `from` up to `to`, or null if unreachable.
 */
export function findPath(grid: Grid, from: Vec, to: Vec, mover: Mover): Vec[] | null {
  const W = grid.width;
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const gx = Math.floor(to.x);
  const gy = Math.floor(to.y);
  if (!grid.walkable(gx, gy, mover)) return null;
  if (sx === gx && sy === gy) return [];

  const size = W * grid.height;
  const g = new Float32Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const heap = new MinHeap();
  const start = sy * W + sx;
  const goal = gy * W + gx;
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - gx);
    const dy = Math.abs(y - gy);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  };
  g[start] = 0;
  heap.push(start, h(sx, sy));

  while (heap.size > 0) {
    const cur = heap.pop();
    if (cur === goal) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % W;
    const cy = (cur - cx) / W;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.walkable(nx, ny, mover)) continue;
        if (dx !== 0 && dy !== 0 && (!grid.walkable(cx + dx, cy, mover) || !grid.walkable(cx, cy + dy, mover))) {
          continue;
        }
        const ni = ny * W + nx;
        if (closed[ni]) continue;
        const cost = g[cur]! + (dx !== 0 && dy !== 0 ? Math.SQRT2 : 1);
        if (cost < g[ni]!) {
          g[ni] = cost;
          came[ni] = cur;
          heap.push(ni, cost + h(nx, ny));
        }
      }
    }
  }

  if (came[goal] === -1) return null;
  const path: Vec[] = [];
  for (let i = goal; i !== start; i = came[i]!) path.push({ x: i % W, y: Math.floor(i / W) });
  return path.reverse();
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  push(id: number, key: number): void {
    this.ids.push(id);
    this.keys.push(key);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p]! <= key) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): number {
    const top = this.ids[0]!;
    const lastId = this.ids.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.ids.length > 0) {
      this.ids[0] = lastId;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.ids.length && this.keys[l]! < this.keys[m]!) m = l;
        if (r < this.ids.length && this.keys[r]! < this.keys[m]!) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b]!, this.ids[a]!];
    [this.keys[a], this.keys[b]] = [this.keys[b]!, this.keys[a]!];
  }
}
