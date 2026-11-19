import { CFG } from '../config';
import {
  canTune,
  defOf,
  RARITY_INFO,
  tuned,
  type ModuleInst,
  type SlotType,
} from '../modules';
import { center, dist, type Guard, type World } from '../world';
import { damageGuard } from './guards';

export interface Outcome {
  ok: boolean;
  msg: string;
}

const done = (w: World, msg: string, level: 'good' | 'info' = 'good'): Outcome => {
  w.log(`> ${msg}`, level);
  return { ok: true, msg };
};
const fail = (w: World, msg: string): Outcome => {
  w.log(`> ${msg}`, 'warn');
  return { ok: false, msg };
};

const nameOf = (m: ModuleInst): string => defOf(m).name;

// ── Per-step upkeep: pickups, burning, EMP timers, heat ─────────────────────

export function updateModules(w: World, dt: number): void {
  const p = w.player;

  if (p.build.mods.heat > 0) p.power -= p.build.mods.heat * dt;

  for (const cam of w.cameras) if (cam.emp > 0) cam.emp = Math.max(0, cam.emp - dt);

  for (const g of w.guards) {
    if (g.burn <= 0) continue;
    g.burn = Math.max(0, g.burn - dt);
    if (g.state !== 'down') damageGuard(w, g, CFG.modules.burnDps * dt, 'burn');
  }

  for (let i = w.modulePickups.length - 1; i >= 0; i--) {
    const pk = w.modulePickups[i]!;
    if (dist(p, pk) > CFG.modules.pickupRange) continue;
    if (p.bag.length >= CFG.modules.bagSize) {
      if (w.time - w.lastNoTargetLog > 2) {
        w.lastNoTargetLog = w.time;
        w.log('> module bag full. Dismantle something to pick this up.', 'warn');
      }
      continue;
    }
    p.bag.push(pk.mod);
    w.modulePickups.splice(i, 1);
    w.emit({ type: 'pickup', x: pk.x, y: pk.y });
    w.log(`> picked up ${nameOf(pk.mod)} [${RARITY_INFO[pk.mod.rarity].label}]. Press E to manage modules.`, 'good');
  }
}

/** Humans sometimes carry a module. Called when one is neutralised. */
export function dropModule(w: World, g: Guard): void {
  if (w.rng() >= CFG.modules.dropChance[g.kind]) return;
  const mod = w.rollModule(g.kind === 'officer' ? 0.4 : 0);
  w.modulePickups.push({ id: mod.uid, x: g.x, y: g.y, mod });
  w.log(`> ${g.name} was carrying hardware: ${nameOf(mod)}.`, 'info');
}

/** Opens a cache: always a module, with a bias toward better tiers. */
export function openCache(w: World, id: number): void {
  const cache = w.caches[id]!;
  cache.opened = true;
  const mod = w.rollModule(0.5);
  const p = w.player;
  if (p.bag.length < CFG.modules.bagSize) {
    p.bag.push(mod);
    w.log(`> cache opened: ${nameOf(mod)} [${RARITY_INFO[mod.rarity].label}]. Press E to manage modules.`, 'good');
  } else {
    const c = center(cache);
    w.modulePickups.push({ id: mod.uid, x: c.x, y: c.y, mod });
    w.log(`> cache opened: ${nameOf(mod)}, but your bag is full. It was left on the floor.`, 'warn');
  }
}

// ── Loadout actions (Workbench and field) ─────────────────────────────────

export function installCost(w: World, m: ModuleInst): number {
  const base = RARITY_INFO[m.rarity].installScrap;
  return w.atWorkbench ? base : base * CFG.modules.fieldInstallMult;
}

export function equip(w: World, uid: number): Outcome {
  const p = w.player;
  const i = p.bag.findIndex((m) => m.uid === uid);
  if (i < 0) return fail(w, 'module not in your bag.');
  const mod = p.bag[i]!;
  const slot = defOf(mod).slot;
  if (!p.version.slots.includes(slot)) return fail(w, `${p.version.codename} has no ${slot.toUpperCase()} slot.`);
  const cost = installCost(w, mod);
  if (p.scrap < cost) return fail(w, `installing ${nameOf(mod)} needs ${cost} SCRAP.`);
  p.scrap -= cost;
  p.bag.splice(i, 1);
  const old = p.equipped[slot];
  if (old) p.bag.push(old);
  p.equipped[slot] = mod;
  w.refreshBuild();
  return done(w, `${nameOf(mod)} installed${old ? `, ${nameOf(old)} returned to the bag` : ''}. −${cost} SCRAP`);
}

export function unequip(w: World, slot: SlotType): Outcome {
  const p = w.player;
  const mod = p.equipped[slot];
  if (!mod) return fail(w, `${slot.toUpperCase()} slot is empty.`);
  if (p.bag.length >= CFG.modules.bagSize) return fail(w, 'module bag full.');
  delete p.equipped[slot];
  p.bag.push(mod);
  w.refreshBuild();
  return done(w, `${nameOf(mod)} removed.`, 'info');
}

export function dismantle(w: World, uid: number): Outcome {
  const p = w.player;
  const i = p.bag.findIndex((m) => m.uid === uid);
  if (i < 0) return fail(w, 'module not in your bag.');
  const mod = p.bag.splice(i, 1)[0]!;
  const gain = RARITY_INFO[mod.rarity].dismantle;
  p.scrap += gain;
  return done(w, `${nameOf(mod)} dismantled. +${gain} SCRAP`, 'info');
}

export function rerollCost(w: World): number {
  return CFG.modules.rerollBase + CFG.modules.rerollStep * (w.rerolls[w.level.act] ?? 0);
}

export function takeOffer(w: World): Outcome {
  const b = w.workbench;
  const p = w.player;
  if (!b || !w.atWorkbench) return fail(w, 'you need to be at a WORKBENCH.');
  if (!b.offer) return fail(w, 'nothing on offer. Reroll for another module.');
  if (p.bag.length >= CFG.modules.bagSize) return fail(w, 'module bag full.');
  p.bag.push(b.offer);
  const taken = b.offer;
  b.offer = null;
  return done(w, `took ${nameOf(taken)} [${RARITY_INFO[taken.rarity].label}] from the workbench.`);
}

export function rerollOffer(w: World): Outcome {
  const b = w.workbench;
  const p = w.player;
  if (!b || !w.atWorkbench) return fail(w, 'you need to be at a WORKBENCH.');
  const cost = rerollCost(w);
  if (p.data < cost) return fail(w, `rerolling needs ${cost} DATA.`);
  p.data -= cost;
  w.rerolls[w.level.act] = (w.rerolls[w.level.act] ?? 0) + 1;
  b.offer = w.rollModule();
  return done(w, `workbench reroll. New offer: ${nameOf(b.offer)}. −${cost} DATA`);
}

// ── Porting modules through a Compile ───────────────────────────────────

/** Called right after the body changes: sets the old loadout aside and asks which modules to carry over. */
export function beginPort(w: World): void {
  const p = w.player;
  const all = [...Object.values(p.equipped), ...p.bag].filter((m): m is ModuleInst => !!m);
  p.equipped = {};
  p.bag = [];
  w.refreshBuild(); // keeps card (subroutine) mods
  const fits = all.filter((m) => p.version.slots.includes(defOf(m).slot));
  const lost = all.length - fits.length;
  if (lost > 0) w.log(`> ${lost} module(s) have no matching slot in ${p.version.codename} and were lost.`, 'warn');
  if (fits.length === 0) return;
  w.port = { candidates: fits, chosen: new Set() };
  w.emit({ type: 'port' });
}

export function portCost(w: World): number {
  const port = w.port;
  if (!port) return 0;
  return port.candidates.filter((m) => port.chosen.has(m.uid)).reduce((sum, m) => sum + RARITY_INFO[m.rarity].portScrap, 0);
}

export function togglePort(w: World, uid: number): Outcome {
  const port = w.port;
  if (!port) return { ok: false, msg: '' };
  const mod = port.candidates.find((m) => m.uid === uid);
  if (!mod) return { ok: false, msg: '' };
  if (port.chosen.has(uid)) {
    port.chosen.delete(uid);
    return { ok: true, msg: '' };
  }
  if (portCost(w) + RARITY_INFO[mod.rarity].portScrap > w.player.scrap) {
    return fail(w, `not enough SCRAP to port ${nameOf(mod)}.`);
  }
  port.chosen.add(uid);
  return { ok: true, msg: '' };
}

export function confirmPort(w: World): void {
  const port = w.port;
  const p = w.player;
  if (!port) return;
  p.scrap -= portCost(w);
  // Best rarity first, so the strongest module of a slot is the one installed.
  const chosen = port.candidates
    .filter((m) => port.chosen.has(m.uid))
    .sort((a, b) => RARITY_INFO[b.rarity].installScrap - RARITY_INFO[a.rarity].installScrap);
  for (const m of chosen) {
    const t = canTune(m) ? tuned(m) : m;
    const slot = defOf(t).slot;
    if (!p.equipped[slot]) p.equipped[slot] = t;
    else if (p.bag.length < CFG.modules.bagSize) p.bag.push(t);
  }
  const dropped = port.candidates.length - chosen.length;
  w.port = null;
  w.refreshBuild();
  p.power = w.maxPower;
  w.log(`> ${chosen.length} module(s) ported and tuned.${dropped > 0 ? ` ${dropped} left behind.` : ''}`, 'good');
}
