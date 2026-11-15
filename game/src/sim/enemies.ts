/** Human enemy types. Behaviour lives in systems/guards.ts; this file holds the numbers. */

export type EnemyKind = 'guard' | 'officer';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  /** Close-range taser. Drains Power per second while in range. */
  melee: { range: number; dps: number } | null;
  /** Sidearm: aims (telegraphed), then fires a projectile. */
  ranged: { range: number; aimTime: number; cooldown: number; bulletSpeed: number; damage: number } | null;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  guard: {
    kind: 'guard',
    hp: 3,
    melee: { range: 1.1, dps: 9 },
    ranged: null,
  },
  officer: {
    kind: 'officer',
    hp: 3,
    melee: null,
    ranged: { range: 6, aimTime: 0.45, cooldown: 1.3, bulletSpeed: 9, damage: 7 },
  },
};
