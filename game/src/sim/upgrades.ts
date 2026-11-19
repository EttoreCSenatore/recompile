/**
 * LEARNING: in-run XP, levels ("iterations") and upgrade cards ("subroutines").
 * ECHO learns from everything it does; each level-up offers three cards. Cards stack in ranks.
 * Separate from modules (gear you find) and the Compile (a new body): these are ECHO's own code.
 */
import { ZERO_MODS, type Mods } from './modules';
import type { World } from './world';

export type CardId =
  | 'servos'
  | 'capacitor'
  | 'recharge'
  | 'quick_cycle'
  | 'ghost'
  | 'siphon'
  | 'fast_hands'
  | 'long_stun'
  | 'bounty'
  | 'phase_dash'
  | 'shock_dash'
  | 'plating'
  | 'chain_shock'
  | 'static_field'
  | 'efficient'
  | 'leech'
  | 'nova'
  | 'claws'
  | 'wide_arc';

export interface CardDef {
  id: CardId;
  name: string;
  max: number;
  /** What one more rank does. */
  text: string;
  /** Stat mods per rank, merged into the build like modules. */
  mods?: Partial<Mods>;
  /** Only offered when this holds (e.g. claws need a body with an attack). */
  requires?: (w: World) => boolean;
}

const hasAttack = (w: World) => !!w.player.version.attack;
const hasShock = (w: World) => w.player.version.ability.id === 'static_shock';

export const CARDS: Record<CardId, CardDef> = {
  servos: { id: 'servos', name: 'Overclocked Servos', max: 4, text: '+12% move speed', mods: { speed: 0.12 } },
  capacitor: { id: 'capacitor', name: 'Capacitor Bank', max: 4, text: '+15% max Power', mods: { maxPower: 0.15 } },
  recharge: { id: 'recharge', name: 'Trickle Charger', max: 3, text: '+50% Power regen', mods: { regen: 0.5 } },
  quick_cycle: { id: 'quick_cycle', name: 'Quick Cycle', max: 3, text: '−10% attack and ability cooldowns', mods: { cooldown: 0.1 } },
  ghost: { id: 'ghost', name: 'Ghost Protocol', max: 3, text: '−20% noise from steps and dashes', mods: { quiet: 0.2 } },
  siphon: { id: 'siphon', name: 'Data Siphon', max: 3, text: '+25% DATA from hacks', mods: { data: 0.25 } },
  fast_hands: { id: 'fast_hands', name: 'Fast Hands', max: 3, text: '+30% hack and scavenge speed', mods: { hackSpeed: 0.3 } },
  long_stun: { id: 'long_stun', name: 'Lingering Charge', max: 3, text: '+25% stun duration', mods: { stun: 0.25 } },
  bounty: { id: 'bounty', name: 'Pattern Learner', max: 3, text: '+25% XP from everything' },
  phase_dash: { id: 'phase_dash', name: 'Phase Dash', max: 3, text: 'dash recharges 20% faster and goes 0.4 tiles further' },
  shock_dash: { id: 'shock_dash', name: 'Arc Dash', max: 2, text: 'dashing through enemies stuns them (drones short out)' },
  plating: { id: 'plating', name: 'Hardened Plating', max: 3, text: '−15% damage taken' },
  chain_shock: { id: 'chain_shock', name: 'Chain Shock', max: 3, text: 'static shock jumps to 1 more enemy nearby', requires: hasShock },
  static_field: { id: 'static_field', name: 'Static Field', max: 2, text: '+0.5 tiles static shock range', requires: hasShock },
  efficient: { id: 'efficient', name: 'Efficient Routines', max: 3, text: '−20% ability Power cost' },
  leech: { id: 'leech', name: 'Power Leech', max: 3, text: '+4 Power per takedown, +1.5 per stun' },
  nova: { id: 'nova', name: 'Discharge Nova', max: 3, text: 'takedowns release a shockwave that stuns enemies nearby' },
  claws: { id: 'claws', name: 'Serrated Claws', max: 3, text: '+1 claw and pounce damage', mods: { damage: 1 }, requires: hasAttack },
  wide_arc: { id: 'wide_arc', name: 'Wide Sweep', max: 2, text: '+25% claw arc and +0.2 reach', requires: hasAttack },
};

export const LEARNING = {
  /** XP for each kind of deed. */
  xp: { data: 8, security: 10, camera: 5, scrap: 4, cache: 6, stun: 5, guard: 12, officer: 16, drone: 5, escape: 4, compile: 30 },
  /** XP needed for the next level: base + step × (level − 1). */
  base: 14,
  step: 9,
  /** Fraction of max Power restored on every level-up. */
  heal: 0.25,
  offerSize: 3,
} as const;

export type XpSource = keyof typeof LEARNING.xp;

export function xpToNext(level: number): number {
  return LEARNING.base + LEARNING.step * (level - 1);
}

export function rank(w: World, id: CardId): number {
  return w.player.cards[id] ?? 0;
}

/** Sum of card mods for the build (added on top of module mods). */
export function cardMods(w: World): Mods {
  const mods: Mods = { ...ZERO_MODS };
  for (const [id, n] of Object.entries(w.player.cards) as [CardId, number][]) {
    for (const [k, v] of Object.entries(CARDS[id].mods ?? {}) as [keyof Mods, number][]) mods[k] += v * n;
  }
  return mods;
}

/** Awards XP; each level reached queues a card pick. */
export function gainXp(w: World, source: XpSource): void {
  const p = w.player;
  const amount = Math.round(LEARNING.xp[source] * (1 + 0.25 * rank(w, 'bounty')));
  p.xp += amount;
  w.emit({ type: 'xp', x: p.x, y: p.y, amount });
  while (p.xp >= xpToNext(p.level)) {
    p.xp -= xpToNext(p.level);
    p.level++;
    p.pendingLevels++;
    p.power = Math.min(w.maxPower, p.power + w.maxPower * LEARNING.heal);
    w.emit({ type: 'levelup', level: p.level });
    w.log(`> ITERATION ${p.level}. New subroutine available.`, 'good');
  }
  if (!p.cardOffer && p.pendingLevels > 0) p.cardOffer = rollOffer(w);
}

/** Three different cards the player can still take. */
export function rollOffer(w: World): CardId[] {
  const pool = (Object.values(CARDS) as CardDef[]).filter((c) => rank(w, c.id) < c.max && (!c.requires || c.requires(w)));
  const offer: CardId[] = [];
  while (offer.length < LEARNING.offerSize && pool.length > 0) {
    const i = Math.floor(w.rng() * pool.length);
    offer.push(pool.splice(i, 1)[0]!.id);
  }
  return offer;
}

/** Takes card `index` from the current offer, then rolls the next offer if more levels are queued. */
export function pickCard(w: World, index: number): void {
  const p = w.player;
  const id = p.cardOffer?.[index];
  if (!id) return;
  p.cards[id] = (p.cards[id] ?? 0) + 1;
  p.pendingLevels = Math.max(0, p.pendingLevels - 1);
  p.cardOffer = p.pendingLevels > 0 ? rollOffer(w) : null;
  if (p.cardOffer && p.cardOffer.length === 0) {
    p.cardOffer = null; // every card is maxed out
    p.pendingLevels = 0;
  }
  w.refreshBuild();
  w.log(`> subroutine installed: ${CARDS[id].name} (rank ${p.cards[id]}).`, 'good');
}
