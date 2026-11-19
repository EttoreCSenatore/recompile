/** ECHO's bodies. Each version changes how the game plays (see docs: design/versions). */

import type { SlotType } from './modules';

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
  /** Module slots this body has (v0.1: 2, v1: 4, v2: 6, v3+: 8). */
  slots: SlotType[];
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
    regen: 0.8,
    speed: 4.0,
    sneakSpeed: 2.1,
    radius: 0.3,
    sensorRadius: 7,
    canUseVents: true,
    slots: ['sensor', 'cpu'],
    attack: null,
    ability: { id: 'static_shock', name: 'STATIC SHOCK', cost: 8, cooldown: 1.5 },
    next: { id: 'v1', data: 40, scrap: 30 },
  },
  v1: {
    id: 'v1',
    codename: 'SCRAPPER',
    maxPower: 80,
    regen: 1.2,
    speed: 5.2,
    sneakSpeed: 2.6,
    radius: 0.38,
    sensorRadius: 8,
    canUseVents: false,
    slots: ['chassis', 'sensor', 'weapon', 'cpu'],
    attack: {
      name: 'CLAWS',
      damage: 1,
      range: 1.15,
      arc: (110 * Math.PI) / 180,
      cooldown: 0.26,
      noiseRadius: 2.5,
    },
    ability: { id: 'pounce', name: 'POUNCE', cost: 10, cooldown: 2 },
    next: null,
  },
};

export const POUNCE = { distance: 3.8, duration: 0.18, hitRadius: 1.1, damage: 2, stun: 1.2, noiseRadius: 4 } as const;
