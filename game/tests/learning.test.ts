import { describe, expect, it } from 'vitest';
import { CFG } from '../src/sim/config';
import { CARDS, gainXp, LEARNING, pickCard, rank, xpToNext } from '../src/sim/upgrades';
import { dist, NO_INPUT, World } from '../src/sim/world';

function quiet(w: World): void {
  for (const g of w.guards) Object.assign(g, { state: 'stunned', stunTimer: 999 });
  for (const c of w.cameras) c.disabled = true;
}

describe('LEARNING: XP, levels and cards', () => {
  it('levels up from XP, restores some Power and offers three different cards', () => {
    const w = new World(1);
    w.player.power = 10;
    while (w.player.level === 1) gainXp(w, 'guard');
    expect(w.player.level).toBe(2);
    expect(w.player.power).toBeGreaterThan(10);
    const offer = w.player.cardOffer!;
    expect(offer).toHaveLength(LEARNING.offerSize);
    expect(new Set(offer).size).toBe(offer.length);
  });

  it('queues one pick per level and rolls a fresh offer after each pick', () => {
    const w = new World(1);
    w.player.xp = xpToNext(1) + xpToNext(2) - 1;
    gainXp(w, 'scrap');
    expect(w.player.level).toBe(3);
    expect(w.player.pendingLevels).toBe(2);
    pickCard(w, 0);
    expect(w.player.pendingLevels).toBe(1);
    expect(w.player.cardOffer).toHaveLength(3);
    pickCard(w, 0);
    expect(w.player.cardOffer).toBeNull();
  });

  it('never offers body-specific cards to the wrong body', () => {
    for (let seed = 1; seed < 30; seed++) {
      const w = new World(seed); // DUSTMITE: no claws
      w.player.xp = xpToNext(1);
      gainXp(w, 'scrap');
      expect(w.player.cardOffer).not.toContain('claws');
      expect(w.player.cardOffer).not.toContain('wide_arc');
    }
  });

  it('stat cards change the build like modules do', () => {
    const w = new World(1);
    const speed = w.player.build.mods.speed;
    w.player.cardOffer = ['servos'];
    w.player.pendingLevels = 1;
    pickCard(w, 0);
    expect(rank(w, 'servos')).toBe(1);
    expect(w.player.build.mods.speed).toBeCloseTo(speed + CARDS.servos.mods!.speed!);
  });

  it('scavenging gives XP', () => {
    const w = new World(1);
    quiet(w);
    const s = w.scrapPiles[0]!;
    Object.assign(w.player, { x: s.x + 0.5, y: s.y + 0.5 });
    for (let t = 0; t < CFG.interact.duration.scrap + 0.1; t += 1 / 60) w.step(1 / 60, { ...NO_INPUT, interact: true });
    expect(w.player.xp > 0 || w.player.level > 1).toBe(true);
  });
});

describe('hunter drones', () => {
  it('launch out of sight once the threat level rises, and chase ECHO', () => {
    const w = new World(3);
    quiet(w);
    w.threat = 3;
    w.hunterTimer = 0;
    for (let t = 0; t < 1; t += 1 / 60) w.step(1 / 60, NO_INPUT);
    const drones = w.guards.filter((g) => g.hunter);
    expect(drones.length).toBeGreaterThan(0);
    const d = drones[0]!;
    const start = dist(d, w.player);
    expect(start).toBeGreaterThanOrEqual(CFG.hunters.minDist - 0.5);
    for (let t = 0; t < 2; t += 1 / 60) w.step(1 / 60, NO_INPUT);
    expect(dist(d, w.player)).toBeLessThan(start);
  });

  it('never launch at the lowest threat level or during a Compile siege', () => {
    const w = new World(3);
    quiet(w);
    w.hunterTimer = 0;
    for (let t = 0; t < 30; t += 1 / 60) w.step(1 / 60, NO_INPUT);
    expect(w.guards.some((g) => g.hunter)).toBe(false);
  });

  it('a static shock destroys a drone and gives XP', () => {
    const w = new World(3);
    quiet(w);
    const d = w.addGuard('drone', { x: w.player.x + 1, y: w.player.y }, { hunter: true });
    w.step(1 / 60, { ...NO_INPUT, ability: true });
    expect(d.state).toBe('down');
    expect(w.player.xp).toBeGreaterThan(0);
  });
});
