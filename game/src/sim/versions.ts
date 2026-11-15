/** ECHO's bodies. Each version changes how the game plays (see docs: design/versions). */

export type VersionId = 'v0.1' | 'v1';
export type AbilityId = 'static_shock' | 'pounce';

export interface AttackDef {
  name: string;
  damage: number;
  /** Reach from ECHO's centre, in tiles. */
  range: number;
  /** Width of the swing, in radians. */
  arc: number;
  cooldown: number;
  noiseRadius: number;
}

export interface VersionDef {
  id: VersionId;
  codename: string;
  maxPower: number;
  regen: number;
  speed: number;
  sneakSpeed: number;
  radius: number;
  sensorRadius: number;
  canUseVents: boolean;
  attack: AttackDef | null;
  ability: { id: AbilityId; name: string; cost: number; cooldown: number };
  /** The version this body compiles into, and what that costs. */
  next: { id: VersionId; data: number; scrap: number } | null;
}

export const VERSIONS: Record<VersionId, VersionDef> = {
  'v0.1': {
    id: 'v0.1',
    codename: 'DUSTMITE',
    maxPower: 30,
    regen: 0.5,
    speed: 3.2,
    sneakSpeed: 1.7,
    radius: 0.3,
    sensorRadius: 7,
    canUseVents: true,
    attack: null,
    ability: { id: 'static_shock', name: 'STATIC SHOCK', cost: 8, cooldown: 2 },
    next: { id: 'v1', data: 40, scrap: 30 },
  },
  v1: {
    id: 'v1',
    codename: 'SCRAPPER',
    maxPower: 80,
    regen: 0.8,
    speed: 4.2,
    sneakSpeed: 2.2,
    radius: 0.38,
    sensorRadius: 8,
    canUseVents: false,
    attack: {
      name: 'CLAWS',
      damage: 1,
      range: 1.15,
      arc: (110 * Math.PI) / 180,
      cooldown: 0.32,
      noiseRadius: 2.5,
    },
    ability: { id: 'pounce', name: 'POUNCE', cost: 12, cooldown: 3 },
    next: null,
  },
};

export const POUNCE = { distance: 3.5, duration: 0.22, hitRadius: 1.1, damage: 2, stun: 1.2, noiseRadius: 4 } as const;
