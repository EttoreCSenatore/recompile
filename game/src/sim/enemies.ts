/** Human enemy types. Behaviour lives in systems/guards.ts; this file holds the numbers. */

export type EnemyKind = 'guard' | 'officer' | 'drone';

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  /** × the guard movement speeds. */
  speed: number;
  /** Close-range taser. Drains Power per second while in range. */
  melee: { range: number; dps: number } | null;
  /** Sidearm: aims (telegraphed), then fires a projectile. */
  ranged: { range: number; aimTime: number; cooldown: number; bulletSpeed: number; damage: number } | null;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  guard: {
    kind: 'guard',
    hp: 3,
    speed: 1,
    melee: { range: 1.1, dps: 9 },
    ranged: null,
  },
  officer: {
    kind: 'officer',
    hp: 3,
    speed: 1,
    melee: null,
    ranged: { range: 6.5, aimTime: 0.4, cooldown: 1.1, bulletSpeed: 11, damage: 6 },
  },
  /** Hunter drone: fragile and fast, it homes in on ECHO once the threat level rises. */
  drone: {
    kind: 'drone',
    hp: 1,
    speed: 1.2,
    melee: { range: 0.9, dps: 6 },
    ranged: null,
  },
};
