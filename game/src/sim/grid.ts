export const TILE = { WALL: 0, FLOOR: 1, VENT: 2, EXIT: 3, WATER: 4 } as const;
export type TileType = (typeof TILE)[keyof typeof TILE];

/**
 * Who is moving: `player` fits through vents (v0.1), `large` is a player body too big
 * for vents (v1+), `guard` is any human.
 */
export type Mover = 'player' | 'large' | 'guard';

export interface Vec {
  x: number;
  y: number;
}

export class Grid {
  readonly tiles: Uint8Array;
  exitOpen = false;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.tiles = new Uint8Array(width * height).fill(TILE.WALL);
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x: number, y: number): TileType {
    if (!this.inBounds(x, y)) return TILE.WALL;
    return this.tiles[y * this.width + x] as TileType;
  }

  set(x: number, y: number, t: TileType): void {
    if (this.inBounds(x, y)) this.tiles[y * this.width + x] = t;
  }

  fill(x: number, y: number, w: number, h: number, t: TileType): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, t);
  }

  walkable(x: number, y: number, mover: Mover): boolean {
    const t = this.get(x, y);
    if (t === TILE.FLOOR || t === TILE.WATER) return true;
    if (t === TILE.VENT) return mover === 'player';
    if (t === TILE.EXIT) return mover !== 'guard' && this.exitOpen;
    return false;
  }

  /** Blocks sight. Vents are opaque, so a player inside a vent cannot be seen. */
  opaque(x: number, y: number): boolean {
    const t = this.get(x, y);
    return t !== TILE.FLOOR && t !== TILE.WATER;
  }

  index(x: number, y: number): number {
    return y * this.width + x;
  }
}
