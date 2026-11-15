import { describe, expect, it } from 'vitest';
import { CFG } from '../src/sim/config';
import { computeBuild, MODULES, rollModule, tuned, type ModuleInst, type SlotType } from '../src/sim/modules';
import { mulberry32 } from '../src/sim/rng';
import {
  beginPort,
  confirmPort,
  dismantle,
  equip,
  openCache,
  rerollCost,
  rerollOffer,
  takeOffer,
  togglePort,
  unequip,
} from '../src/sim/systems/loadout';
import { damageGuard } from '../src/sim/systems/guards';
import { center, NO_INPUT, World } from '../src/sim/world';

let uid = 1000;
const inst = (id: string): ModuleInst => ({ uid: uid++, id, rarity: MODULES[id]!.rarity });

function giveBag(w: World, ...ids: string[]): ModuleInst[] {
  const mods = ids.map(inst);
  w.player.bag.push(...mods);
  return mods;
}

function atBench(w: World): void {
  const b = w.workbench!;
  Object.assign(w.player, center(b));
}

function quiet(w: World): void {
  for (const g of w.guards) {
    g.state = 'stunned';
    g.stunTimer = 999;
  }
  for (const c of w.cameras) c.disabled = true;
}

describe('module data', () => {
  it('every module has a valid slot, 1-2 tags at most and defined mods', () => {
    for (const d of Object.values(MODULES)) {
      expect(d.tags.length).toBeLessThanOrEqual(2);
      expect(Object.keys(d.mods).length).toBeGreaterThan(0);
    }
  });

  it('every slot of every body has at least two modules to find', () => {
    const w = new World(1);
    for (const slot of ['sensor', 'cpu', 'chassis', 'weapon'] as SlotType[]) {
      expect(Object.values(MODULES).filter((d) => d.slot === slot).length).toBeGreaterThanOrEqual(3);
    }
    expect(w.player.version.slots).toHaveLength(2);
  });

  it('anomalous modules always carry a drawback', () => {
    for (const d of Object.values(MODULES).filter((x) => x.rarity === 'anomalous')) {
      expect(d.mods.heat || d.mods.attackCost).toBeTruthy();
    }
  });

  it('rolls are deterministic and respect the slots', () => {
    const a = rollModule(mulberry32(5), ['sensor'], 1);
    const b = rollModule(mulberry32(5), ['sensor'], 1);
    expect(a).toEqual(b);
    for (let i = 0; i < 50; i++) expect(MODULES[rollModule(mulberry32(i), ['cpu'], i).id]!.slot).toBe('cpu');
  });
});

describe('builds and set bonuses', () => {
  it('sums mods and counts tags; 3 of a tag activates the set', () => {
    const b = computeBuild({ cpu: inst('script_kit'), sensor: inst('parasite_probe') });
    expect(b.mods.hackSpeed).toBeCloseTo(0.25);
    expect(b.tagCounts.VIRAL).toBe(2);
    expect(b.tags.has('VIRAL')).toBe(false);
    const full = computeBuild({ cpu: inst('worm_loader'), sensor: inst('parasite_probe'), weapon: inst('arc_welder'), chassis: inst('ceramic_plating') });
    expect(full.tags.size).toBe(0);
    const viral = computeBuild({ cpu: inst('worm_loader'), sensor: inst('parasite_probe'), chassis: inst('script_kit') as ModuleInst });
    expect(viral.tags.has('VIRAL')).toBe(true);
  });

  it('tuning raises rarity and strengthens only the good numbers', () => {
    const m = inst('overclocked_core');
    expect(tuned(m)).toBe(m); // anomalous cannot tune
    const wide = inst('wide_lens');
    const t = tuned(wide);
    expect(t.rarity).toBe('military');
    expect(computeBuild({ sensor: t }).mods.sensor).toBeCloseTo(1.5 * 1.3);
    const plating = tuned(inst('ceramic_plating'));
    const b = computeBuild({ chassis: plating });
    expect(b.mods.maxPower).toBeCloseTo(0.26);
    expect(b.mods.speed).toBeCloseTo(-0.1); // drawback is not amplified
  });

  it('caps cooldown reduction', () => {
    const b = computeBuild({ cpu: inst('overclocked_core'), weapon: inst('arc_welder') });
    expect(b.mods.cooldown).toBeLessThanOrEqual(0.7);
  });
});

describe('loadout actions', () => {
  it('installs for scrap at a workbench, and at double cost in the field', () => {
    const w = new World(7);
    const [lens] = giveBag(w, 'wide_lens');
    w.player.scrap = 100;
    expect(equip(w, lens!.uid).ok).toBe(true);
    expect(w.player.scrap).toBe(100 - 4 * CFG.modules.fieldInstallMult);
    expect(w.player.build.mods.sensor).toBeCloseTo(1.5);

    const w2 = new World(7);
    const [lens2] = giveBag(w2, 'wide_lens');
    w2.player.scrap = 100;
    atBench(w2);
    equip(w2, lens2!.uid);
    expect(w2.player.scrap).toBe(96);
  });

  it('refuses when poor, when there is no slot, and swaps an occupied slot', () => {
    const w = new World(7);
    const [lens, plating, eye] = giveBag(w, 'wide_lens', 'ceramic_plating', 'thermal_eye');
    expect(equip(w, lens!.uid).ok).toBe(false); // no scrap
    w.player.scrap = 100;
    expect(equip(w, plating!.uid).ok).toBe(false); // DUSTMITE has no chassis slot
    expect(equip(w, lens!.uid).ok).toBe(true);
    expect(equip(w, eye!.uid).ok).toBe(true);
    expect(w.player.equipped.sensor?.id).toBe('thermal_eye');
    expect(w.player.bag.map((m) => m.id)).toContain('wide_lens');
  });

  it('unequips into the bag and dismantles for scrap', () => {
    const w = new World(7);
    const [lens] = giveBag(w, 'wide_lens');
    w.player.scrap = 50;
    equip(w, lens!.uid);
    expect(unequip(w, 'sensor').ok).toBe(true);
    expect(w.player.build.mods.sensor).toBe(0);
    const before = w.player.scrap;
    expect(dismantle(w, lens!.uid).ok).toBe(true);
    expect(w.player.scrap).toBe(before + 2);
  });

  it('chassis modules raise max Power and clamp current Power', () => {
    const w = new World(7, { version: 'v1' });
    const [plate] = giveBag(w, 'ceramic_plating');
    w.player.scrap = 50;
    equip(w, plate!.uid);
    expect(w.maxPower).toBe(96);
  });

  it('the bag is capped', () => {
    const w = new World(7);
    atBench(w);
    for (let i = 0; i < CFG.modules.bagSize; i++) giveBag(w, 'wide_lens');
    expect(takeOffer(w).ok).toBe(false);
  });
});

describe('workbench and caches', () => {
  it('offers one module, rerolls cost rising Data', () => {
    const w = new World(11);
    expect(takeOffer(w).ok).toBe(false); // not at the bench
    atBench(w);
    expect(takeOffer(w).ok).toBe(true);
    expect(w.player.bag).toHaveLength(1);
    expect(takeOffer(w).ok).toBe(false); // already taken
    w.player.data = 100;
    const first = rerollCost(w);
    expect(rerollOffer(w).ok).toBe(true);
    expect(rerollCost(w)).toBe(first + CFG.modules.rerollStep);
    expect(w.workbench!.offer).not.toBeNull();
    expect(w.player.data).toBe(100 - first);
  });

  it('rerolls need Data', () => {
    const w = new World(11);
    atBench(w);
    expect(rerollOffer(w).ok).toBe(false);
  });

  it('caches always give a module through hold-F', () => {
    const w = new World(3);
    quiet(w);
    const c = w.caches[0]!;
    Object.assign(w.player, center(c));
    for (let t = 0; t < 3; t += 1 / 60) w.step(1 / 60, { ...NO_INPUT, interact: true });
    expect(c.opened).toBe(true);
    expect(w.player.bag).toHaveLength(1);
    expect(openCache).toBeTypeOf('function');
  });

  it('the workbench is in reach of both levels', () => {
    for (const start of ['lab', 'undercity'] as const) {
      const w = new World(1, { startLevel: start });
      expect(w.workbench).not.toBeNull();
      expect(w.caches.length).toBeGreaterThan(0);
    }
  });
});

describe('drops and pickups', () => {
  it('neutralised humans can drop a module that is picked up by walking over it', () => {
    let dropped = 0;
    for (let seed = 1; seed <= 40 && dropped === 0; seed++) {
      const w = new World(seed, { version: 'v1' });
      const g = w.guards[0]!;
      damageGuard(w, g, 99);
      dropped = w.modulePickups.length;
      if (dropped) {
        const pk = w.modulePickups[0]!;
        Object.assign(w.player, { x: pk.x, y: pk.y });
        quiet(w);
        w.step(1 / 60, NO_INPUT);
        expect(w.player.bag).toHaveLength(1);
        expect(w.modulePickups).toHaveLength(0);
      }
    }
    expect(dropped).toBeGreaterThan(0);
  });
});

describe('set bonus effects', () => {
  const fullBuild = (w: World, mods: Record<string, string>): void => {
    for (const [slot, id] of Object.entries(mods)) w.player.equipped[slot as SlotType] = inst(id);
    w.refreshBuild();
  };

  it('STEALTH triples the first hit on an unaware human', () => {
    const w = new World(2, { version: 'v1' });
    fullBuild(w, { sensor: 'thermal_eye', chassis: 'leech_frame', weapon: 'honed_claws' });
    expect(w.player.build.tags.has('STEALTH')).toBe(true);
    const g = w.guards[0]!;
    g.hp = 100;
    g.state = 'patrol';
    damageGuard(w, g, 1);
    expect(g.hp).toBe(97);
  });

  it('THERMAL ignites and burning targets take extra damage', () => {
    const w = new World(2, { version: 'v1' });
    fullBuild(w, { sensor: 'thermal_eye', chassis: 'heat_sink', cpu: 'overclocked_core' });
    expect(w.player.build.tags.has('THERMAL')).toBe(true);
    const g = w.guards[0]!;
    g.hp = 100;
    g.state = 'alert';
    damageGuard(w, g, 1);
    expect(g.burn).toBeGreaterThan(0);
    damageGuard(w, g, 1);
    expect(g.hp).toBeCloseTo(100 - 1 - 1.25);
  });

  it('PARASITIC restores Power for damage dealt', () => {
    const w = new World(2, { version: 'v1' });
    fullBuild(w, { sensor: 'parasite_probe', chassis: 'leech_frame', weapon: 'siphon_claws' });
    w.player.power = 10;
    const g = w.guards[0]!;
    g.hp = 100;
    g.state = 'alert';
    damageGuard(w, g, 2);
    expect(w.player.power).toBeCloseTo(10 + 2 * CFG.modules.leech);
  });

  it('heat drains Power each second', () => {
    const w = new World(2, { version: 'v1' });
    quiet(w);
    fullBuild(w, { cpu: 'overclocked_core' });
    w.player.power = 50;
    const before = w.player.power;
    for (let t = 0; t < 1; t += 1 / 60) w.step(1 / 60, NO_INPUT);
    expect(w.player.power).toBeLessThan(before + 0.8 * 1 - 0.5); // regen < heat + regen margin
  });
});

describe('porting through a Compile', () => {
  function compileWorld(): World {
    const w = new World(5);
    w.player.scrap = 100;
    return w;
  }

  it('lets the player choose which modules to carry, tunes them and spends scrap', () => {
    const w = compileWorld();
    const [lens, kit] = giveBag(w, 'wide_lens', 'script_kit');
    equip(w, lens!.uid);
    equip(w, kit!.uid);
    w.player.version = { ...w.player.version, slots: ['chassis', 'sensor', 'weapon', 'cpu'] };
    w.player.scrap = 10;
    beginPort(w);
    expect(w.port).not.toBeNull();
    expect(w.player.build.mods.sensor).toBe(0);
    // Paused while choosing.
    const t = w.time;
    w.step(1 / 60, NO_INPUT);
    expect(w.time).toBe(t);

    expect(togglePort(w, lens!.uid).ok).toBe(true);
    confirmPort(w);
    expect(w.port).toBeNull();
    expect(w.player.scrap).toBe(10 - 2);
    expect(w.player.equipped.sensor?.rarity).toBe('military');
    expect(w.player.equipped.cpu).toBeUndefined(); // not ported, lost
    expect(w.player.build.mods.sensor).toBeCloseTo(1.5 * 1.3);
  });

  it('cannot port more than the scrap allows', () => {
    const w = compileWorld();
    giveBag(w, 'thermal_eye');
    w.player.scrap = 1;
    w.player.bag.push(inst('wide_lens'));
    beginPort(w);
    const eye = w.port!.candidates[0]!;
    expect(togglePort(w, eye.uid).ok).toBe(false);
  });

  it('does nothing when there is nothing to carry', () => {
    const w = compileWorld();
    beginPort(w);
    expect(w.port).toBeNull();
  });
});
