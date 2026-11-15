/** Modules: the loot of RECOMPILE (see docs: design/modules). Pure data and helpers, no rendering. */

export type SlotType = 'chassis' | 'locomotion' | 'sensor' | 'weapon' | 'cpu' | 'network';
export type Rarity = 'salvaged' | 'military' | 'prototype' | 'anomalous';
/** KINETIC and SWARM exist in the design but need systems that land in later milestones. */
export type Tag = 'THERMAL' | 'EMP' | 'STEALTH' | 'VIRAL' | 'PARASITIC';

export const RARITIES: Rarity[] = ['salvaged', 'military', 'prototype', 'anomalous'];

export const RARITY_INFO: Record<Rarity, { label: string; color: string; installScrap: number; portScrap: number; dismantle: number; weight: number }> = {
  salvaged: { label: 'SALVAGED', color: '#9aa7a0', installScrap: 4, portScrap: 2, dismantle: 2, weight: 56 },
  military: { label: 'MILITARY', color: '#6aa8ff', installScrap: 7, portScrap: 3, dismantle: 4, weight: 28 },
  prototype: { label: 'PROTOTYPE', color: '#b784ff', installScrap: 11, portScrap: 5, dismantle: 7, weight: 12 },
  anomalous: { label: 'ANOMALOUS', color: '#ff5a5a', installScrap: 16, portScrap: 8, dismantle: 11, weight: 4 },
};

/** Numeric effects a module can have. Fractions are multipliers (0.2 = +20%). */
export interface Mods {
  /** × max Power. */
  maxPower: number;
  /** × movement speed. */
  speed: number;
  /** Added to the sensor radius, in tiles. */
  sensor: number;
  /** Added to melee and pounce damage. */
  damage: number;
  /** Fraction removed from attack and ability cooldowns. */
  cooldown: number;
  /** × hack and scavenge speed. */
  hackSpeed: number;
  /** × passive Power regeneration. */
  regen: number;
  /** Power drained per second (heat). */
  heat: number;
  /** Fraction removed from footstep noise. */
  quiet: number;
  /** × Data from hacking. */
  data: number;
  /** × stun duration. */
  stun: number;
  /** Power spent per melee attack. */
  attackCost: number;
}

export type ModKey = keyof Mods;

export const MOD_LABELS: Record<ModKey, string> = {
  maxPower: 'max Power',
  speed: 'speed',
  sensor: 'sensor range',
  damage: 'damage',
  cooldown: 'cooldowns',
  hackSpeed: 'hack speed',
  regen: 'Power regen',
  heat: 'heat (Power/s)',
  quiet: 'footstep noise',
  data: 'Data from hacks',
  stun: 'stun time',
  attackCost: 'Power per attack',
};

/** Mods that read better as a plain number than as a percentage. */
const FLAT_MODS: ReadonlySet<ModKey> = new Set(['sensor', 'damage', 'heat', 'attackCost']);
/** Mods where a negative value is the good one (shown in the "good" colour). */
const LOWER_IS_BETTER: ReadonlySet<ModKey> = new Set(['heat', 'attackCost']);

export interface ModuleDef {
  id: string;
  name: string;
  slot: SlotType;
  rarity: Rarity;
  tags: Tag[];
  mods: Partial<Mods>;
  /** Flavour or rules text shown under the stats. */
  note: string;
}

const m = (def: ModuleDef): ModuleDef => def;

export const MODULES: Record<string, ModuleDef> = Object.fromEntries(
  [
    // Sensor
    m({ id: 'wide_lens', name: 'Wide-Angle Lens', slot: 'sensor', rarity: 'salvaged', tags: [], mods: { sensor: 1.5 }, note: 'A scratched lens from a security camera.' }),
    m({ id: 'thermal_eye', name: 'Thermal Eye', slot: 'sensor', rarity: 'military', tags: ['THERMAL', 'STEALTH'], mods: { sensor: 2, data: 0.15 }, note: 'Heat signatures glow through the dark.' }),
    m({ id: 'ghost_array', name: 'Ghost Array', slot: 'sensor', rarity: 'prototype', tags: ['STEALTH', 'EMP'], mods: { quiet: 0.5, sensor: 1 }, note: 'Cancels your own footsteps.' }),
    m({ id: 'parasite_probe', name: 'Parasite Probe', slot: 'sensor', rarity: 'salvaged', tags: ['PARASITIC', 'VIRAL'], mods: { data: 0.3 }, note: 'Siphons a little extra from every system.' }),
    // CPU
    m({ id: 'script_kit', name: 'Script Kit', slot: 'cpu', rarity: 'salvaged', tags: ['VIRAL'], mods: { hackSpeed: 0.25 }, note: 'Pre-written exploits for old firmware.' }),
    m({ id: 'worm_loader', name: 'Worm Loader', slot: 'cpu', rarity: 'military', tags: ['VIRAL', 'EMP'], mods: { hackSpeed: 0.4, cooldown: 0.1 }, note: 'Hacks leave something behind.' }),
    m({ id: 'surge_regulator', name: 'Surge Regulator', slot: 'cpu', rarity: 'military', tags: ['EMP'], mods: { regen: 0.6, stun: 0.25 }, note: 'Smooths the power rails, lengthens shocks.' }),
    m({ id: 'overclocked_core', name: 'Overclocked Core', slot: 'cpu', rarity: 'anomalous', tags: ['THERMAL'], mods: { cooldown: 0.35, hackSpeed: 0.3, heat: 0.6 }, note: 'Drawback: runs hot and bleeds Power.' }),
    // Chassis
    m({ id: 'ceramic_plating', name: 'Ceramic Plating', slot: 'chassis', rarity: 'salvaged', tags: [], mods: { maxPower: 0.2, speed: -0.1 }, note: 'Heavy, but it holds a charge.' }),
    m({ id: 'capacitor_bank', name: 'Capacitor Bank', slot: 'chassis', rarity: 'military', tags: ['EMP'], mods: { maxPower: 0.35, regen: 0.3 }, note: 'Stores a lot of lightning.' }),
    m({ id: 'heat_sink', name: 'Heat Sink Fins', slot: 'chassis', rarity: 'salvaged', tags: ['THERMAL'], mods: { maxPower: 0.1, regen: 0.2 }, note: 'Bled-off heat, put to work.' }),
    m({ id: 'leech_frame', name: 'Leech Frame', slot: 'chassis', rarity: 'prototype', tags: ['PARASITIC', 'STEALTH'], mods: { maxPower: 0.15, speed: 0.1, quiet: 0.25 }, note: 'Light, hungry, quiet.' }),
    // Weapon
    m({ id: 'honed_claws', name: 'Honed Claws', slot: 'weapon', rarity: 'salvaged', tags: ['STEALTH'], mods: { damage: 0.5 }, note: 'Ground on a lathe. Cuts cleaner.' }),
    m({ id: 'arc_welder', name: 'Arc Welder', slot: 'weapon', rarity: 'military', tags: ['THERMAL', 'EMP'], mods: { damage: 0.5, cooldown: 0.15 }, note: 'Sparks and slag on every swing.' }),
    m({ id: 'siphon_claws', name: 'Siphon Claws', slot: 'weapon', rarity: 'prototype', tags: ['PARASITIC'], mods: { damage: 0.75, stun: 0.3 }, note: 'Barbed. It drinks.' }),
    m({ id: 'grief_engine', name: 'Grief Engine', slot: 'weapon', rarity: 'anomalous', tags: ['PARASITIC', 'THERMAL'], mods: { damage: 1.5, attackCost: 1 }, note: 'Drawback: every swing costs Power. It remembers each one.' }),
  ].map((d) => [d.id, d]),
);

export interface TagDef {
  tag: Tag;
  /** What the 3-piece set bonus does. Implemented in the systems that read `Build.tags`. */
  bonus: string;
}

export const TAGS: Record<Tag, TagDef> = {
  THERMAL: { tag: 'THERMAL', bonus: 'Attacks ignite; burning enemies take +25% damage' },
  EMP: { tag: 'EMP', bonus: 'Stuns also knock out cameras within 4 tiles for 8 s' },
  STEALTH: { tag: 'STEALTH', bonus: 'First hit on an unaware human deals ×3 damage' },
  VIRAL: { tag: 'VIRAL', bonus: 'Hacks spread to one nearby camera' },
  PARASITIC: { tag: 'PARASITIC', bonus: 'Damage dealt restores Power' },
};

export const SET_SIZE = 3;

/** A concrete copy of a module. Rarity can rise above the base def through tuning. */
export interface ModuleInst {
  uid: number;
  id: string;
  rarity: Rarity;
}

export const defOf = (m: ModuleInst): ModuleDef => MODULES[m.id]!;
export const rarityIndex = (r: Rarity): number => RARITIES.indexOf(r);

/** Strength multiplier from tuning: +30% to the good numbers per tier above the base rarity. */
export function tuneScale(m: ModuleInst): number {
  return 1 + 0.3 * (rarityIndex(m.rarity) - rarityIndex(defOf(m).rarity));
}

export function canTune(m: ModuleInst): boolean {
  return m.rarity !== 'anomalous';
}

export function tuned(m: ModuleInst): ModuleInst {
  if (!canTune(m)) return m;
  return { ...m, rarity: RARITIES[rarityIndex(m.rarity) + 1]! };
}

/** The effective mods of one installed module, with tuning applied to the beneficial values. */
export function modsOf(m: ModuleInst): Partial<Mods> {
  const scale = tuneScale(m);
  const out: Partial<Mods> = {};
  for (const [k, v] of Object.entries(defOf(m).mods) as [ModKey, number][]) {
    const good = LOWER_IS_BETTER.has(k) ? v < 0 : v > 0;
    out[k] = good ? v * scale : v;
  }
  return out;
}

export function describeMod(k: ModKey, v: number): string {
  const sign = v > 0 ? '+' : '−';
  const abs = Math.abs(v);
  const num = FLAT_MODS.has(k) ? String(Math.round(abs * 100) / 100) : `${Math.round(abs * 100)}%`;
  return `${sign}${num} ${MOD_LABELS[k]}`;
}

export function isBadMod(k: ModKey, v: number): boolean {
  return LOWER_IS_BETTER.has(k) ? v > 0 : v < 0;
}

export const ZERO_MODS: Readonly<Mods> = {
  maxPower: 0,
  speed: 0,
  sensor: 0,
  damage: 0,
  cooldown: 0,
  hackSpeed: 0,
  regen: 0,
  heat: 0,
  quiet: 0,
  data: 0,
  stun: 0,
  attackCost: 0,
};

export interface Build {
  mods: Mods;
  /** Tags with a full set bonus. */
  tags: ReadonlySet<Tag>;
  /** How many installed modules carry each tag (for the loadout panel). */
  tagCounts: Partial<Record<Tag, number>>;
}

export const EMPTY_BUILD: Build = { mods: { ...ZERO_MODS }, tags: new Set(), tagCounts: {} };

export function computeBuild(equipped: Partial<Record<SlotType, ModuleInst>>): Build {
  const mods: Mods = { ...ZERO_MODS };
  const tagCounts: Partial<Record<Tag, number>> = {};
  for (const inst of Object.values(equipped)) {
    if (!inst) continue;
    for (const [k, v] of Object.entries(modsOf(inst)) as [ModKey, number][]) mods[k] += v;
    for (const t of defOf(inst).tags) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  }
  const tags = new Set<Tag>();
  for (const [t, n] of Object.entries(tagCounts) as [Tag, number][]) if (n >= SET_SIZE) tags.add(t);
  // Cooldown reduction can never reach zero.
  mods.cooldown = Math.min(mods.cooldown, 0.7);
  return { mods, tags, tagCounts };
}

/** Picks a module for the given slots; rarer tiers are weighted down. `bias` shifts weight toward rarer tiers. */
export function rollModule(rng: () => number, slots: readonly SlotType[], uid: number, bias = 0): ModuleInst {
  const pool = Object.values(MODULES).filter((d) => slots.includes(d.slot));
  const weights = pool.map((d) => RARITY_INFO[d.rarity].weight * (1 + bias * rarityIndex(d.rarity)));
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return { uid, id: pool[i]!.id, rarity: pool[i]!.rarity };
  }
  const last = pool[pool.length - 1]!;
  return { uid, id: last.id, rarity: last.rarity };
}
