import { CFG } from '../config';
import { angleDiff, castRay, clearPath } from '../los';
import { POUNCE } from '../versions';
import { center, dist, type Guard, type InteractTarget, type World } from '../world';
import { damageGuard, stunGuard } from './guards';
import { openCache } from './loadout';
import { startCompile } from './siege';

// ── Attack and abilities ────────────────────────────────────────────────

export function updateAbilityAndAttack(w: World, _dt: number, input: { attack: boolean; ability: boolean }): void {
  const p = w.player;
  if (input.ability) useAbility(w);
  if (input.attack && p.version.attack && p.attackCooldown <= 0 && !p.pounce && !p.inVent) attack(w);
}

function attack(w: World): void {
  const p = w.player;
  const a = p.version.attack!;
  const mods = p.build.mods;
  p.attackCooldown = a.cooldown * (1 - mods.cooldown);
  if (mods.attackCost > 0) p.power -= mods.attackCost;
  w.emit({ type: 'slash', x: p.x, y: p.y, facing: p.facing, range: a.range });
  w.emitNoise(p.x, p.y, a.noiseRadius);
  for (const g of w.guards) {
    if (g.state === 'down') continue;
    const d = dist(p, g);
    if (d > a.range + CFG.guard.radius) continue;
    if (d > 0.5 && Math.abs(angleDiff(p.facing, Math.atan2(g.y - p.y, g.x - p.x))) > a.arc / 2) continue;
    if (!clearPath(w.grid, p.x, p.y, g.x, g.y)) continue;
    damageGuard(w, g, a.damage + mods.damage);
  }
}

function useAbility(w: World): void {
  const p = w.player;
  const ab = p.version.ability;
  if (p.abilityCooldown > 0 || p.pounce) return;
  if (p.inVent) {
    w.log(`> ${ab.name.toLowerCase()}: not possible inside a vent.`, 'warn');
    return;
  }
  if (ab.id === 'static_shock') staticShock(w);
  else startPounce(w);
}

function staticShock(w: World): void {
  const p = w.player;
  const ab = p.version.ability;
  let best: Guard | null = null;
  let bestD = Infinity;
  for (const g of w.guards) {
    if (g.state === 'stunned' || g.state === 'down') continue;
    const d = dist(p, g);
    if (d <= CFG.stun.range && d < bestD && clearPath(w.grid, p.x, p.y, g.x, g.y)) {
      best = g;
      bestD = d;
    }
  }
  if (!best) {
    if (w.time - w.lastNoTargetLog > 1.5) {
      w.lastNoTargetLog = w.time;
      w.log('> static_shock: no target in range.', 'info');
    }
    return;
  }
  if (p.power <= ab.cost) {
    w.log('> static_shock: insufficient power.', 'warn');
    return;
  }
  p.power -= ab.cost;
  p.abilityCooldown = ab.cooldown * (1 - p.build.mods.cooldown);
  const stun = CFG.stun.duration * (1 + p.build.mods.stun);
  stunGuard(best, stun);
  empBurst(w, best.x, best.y);
  w.stats.stuns++;
  w.emit({ type: 'stun', x: best.x, y: best.y });
  w.log(`> static_shock -> ${best.name}: STUNNED (${stun.toFixed(1)}s)`, 'good');
  w.emitNoise(best.x, best.y, CFG.stun.noiseRadius, best);
}

function startPounce(w: World): void {
  const p = w.player;
  const ab = p.version.ability;
  if (p.power <= ab.cost) {
    w.log('> pounce: insufficient power.', 'warn');
    return;
  }
  const reach = Math.min(POUNCE.distance, castRay(w.grid, p.x, p.y, p.facing, POUNCE.distance) - p.version.radius - 0.05);
  if (reach < 0.6) return;
  p.power -= ab.cost;
  p.abilityCooldown = ab.cooldown * (1 - p.build.mods.cooldown);
  p.pounce = { dx: Math.cos(p.facing) * reach, dy: Math.sin(p.facing) * reach, t: 0 };
}

/** Pounce impact: damages and briefly stuns everyone in the landing zone. */
export function landPounce(w: World): void {
  const p = w.player;
  w.emit({ type: 'stun', x: p.x, y: p.y });
  w.emitNoise(p.x, p.y, POUNCE.noiseRadius);
  for (const g of w.guards) {
    if (g.state === 'down' || dist(p, g) > POUNCE.hitRadius + CFG.guard.radius) continue;
    damageGuard(w, g, POUNCE.damage + p.build.mods.damage);
    if (g.hp > 0) stunGuard(g, POUNCE.stun * (1 + p.build.mods.stun));
  }
  empBurst(w, p.x, p.y);
}

/** EMP set bonus: stuns also knock out nearby cameras for a while. */
function empBurst(w: World, x: number, y: number): void {
  if (!w.player.build.tags.has('EMP')) return;
  let hit = 0;
  for (const cam of w.cameras) {
    if (cam.disabled || Math.hypot(cam.x - x, cam.y - y) > CFG.modules.empRange) continue;
    cam.emp = CFG.modules.empTime;
    cam.seesPlayer = false;
    cam.suspicion = 0;
    hit++;
  }
  if (hit > 0) w.log(`> EMP: ${hit} camera(s) knocked out for ${CFG.modules.empTime}s.`, 'good');
}

// ── Interaction: hack, scavenge, compile ────────────────────────────────

export function updateInteract(w: World, dt: number, holding: boolean): void {
  const p = w.player;
  if (!holding) {
    p.interactLatch = false;
    if (p.interact) w.log(`> ${label(w, p.interact.target)}: interrupted.`, 'warn');
    p.interact = null;
    return;
  }
  if (p.interactLatch || p.inVent) {
    p.interact = null;
    return;
  }
  const target = p.interact?.target ?? findTarget(w);
  if (!target || !available(w, target) || dist(p, targetPos(w, target)) > CFG.interact.range) {
    if (p.interact) w.log(`> ${label(w, p.interact.target)}: interrupted.`, 'warn');
    p.interact = null;
    return;
  }
  const kind = targetKind(w, target);
  if (!p.interact) {
    const speed = kind === 'fabricator' ? 1 : 1 + p.build.mods.hackSpeed;
    p.interact = { target, progress: 0, duration: CFG.interact.duration[kind] / speed, noiseTimer: 0 };
    if (kind !== 'fabricator') w.log(`> ${kind === 'scrap' || kind === 'cache' ? 'scavenging' : 'hacking'} ${label(w, target)}...`, 'info');
  }
  p.interact.progress += dt;
  p.interact.noiseTimer += dt;
  if (p.interact.noiseTimer >= CFG.interact.noiseEvery) {
    p.interact.noiseTimer = 0;
    w.emitNoise(p.x, p.y, CFG.interact.noiseRadius[kind]);
  }
  if (p.interact.progress >= p.interact.duration) {
    complete(w, target);
    p.interact = null;
    p.interactLatch = true;
  }
}

/** Text for the interaction prompt in the HUD, or null when nothing is in range. */
export function interactionHint(w: World): string | null {
  const p = w.player;
  if (p.interact && targetKind(w, p.interact.target) !== 'fabricator') {
    const pct = Math.floor((p.interact.progress / p.interact.duration) * 100);
    return `${['scrap', 'cache'].includes(targetKind(w, p.interact.target)) ? 'SCAVENGING' : 'HACKING'} ${label(w, p.interact.target)} ${pct}%`;
  }
  const t = findTarget(w);
  if (!t) return null;
  if (t.kind === 'fabricator') {
    const fab = w.fabricator!;
    const next = p.version.next;
    if (fab.state === 'locked') return 'FABRICATOR offline: hack the SECURITY terminal';
    if (!next) return null;
    if (p.data < next.data || p.scrap < next.scrap) {
      return `COMPILE needs ${next.data} ◇ DATA + ${next.scrap} ▣ SCRAP (you have ${p.data} / ${p.scrap})`;
    }
    return `[F] hold to COMPILE ${next.id} (−${next.data} ◇ −${next.scrap} ▣)`;
  }
  return `[F] hold to ${t.kind === 'scrap' ? 'scavenge' : t.kind === 'cache' ? 'crack open' : 'hack'} ${label(w, t)}`;
}

function findTarget(w: World): InteractTarget | null {
  const p = w.player;
  let best: InteractTarget | null = null;
  let bestD: number = CFG.interact.range;
  const consider = (t: InteractTarget, d: number) => {
    if (d <= bestD) {
      best = t;
      bestD = d;
    }
  };
  for (const t of w.terminals) if (!t.hacked) consider({ kind: 'terminal', id: t.id }, dist(p, center(t)));
  for (const c of w.cameras) if (!c.disabled) consider({ kind: 'camera', id: c.id }, dist(p, c));
  for (const s of w.scrapPiles) if (!s.taken) consider({ kind: 'scrap', id: s.id }, dist(p, center(s)));
  for (const c of w.caches) if (!c.opened) consider({ kind: 'cache', id: c.id }, dist(p, center(c)));
  const fab = w.fabricator;
  if (fab && (fab.state === 'locked' || fab.state === 'ready')) consider({ kind: 'fabricator' }, dist(p, center(fab)));
  return best;
}

function available(w: World, t: InteractTarget): boolean {
  switch (t.kind) {
    case 'terminal':
      return !w.terminals[t.id]!.hacked;
    case 'camera':
      return !w.cameras[t.id]!.disabled;
    case 'scrap':
      return !w.scrapPiles[t.id]!.taken;
    case 'cache':
      return !w.caches[t.id]!.opened;
    case 'fabricator': {
      const next = w.player.version.next;
      return w.fabricator?.state === 'ready' && !!next && w.player.data >= next.data && w.player.scrap >= next.scrap;
    }
  }
}

function targetPos(w: World, t: InteractTarget) {
  switch (t.kind) {
    case 'terminal':
      return center(w.terminals[t.id]!);
    case 'camera':
      return w.cameras[t.id]!;
    case 'scrap':
      return center(w.scrapPiles[t.id]!);
    case 'cache':
      return center(w.caches[t.id]!);
    case 'fabricator':
      return center(w.fabricator!);
  }
}

function targetKind(w: World, t: InteractTarget): keyof typeof CFG.interact.duration {
  if (t.kind === 'terminal') return w.terminals[t.id]!.kind;
  return t.kind;
}

function label(w: World, t: InteractTarget): string {
  switch (t.kind) {
    case 'camera':
      return w.cameras[t.id]!.name;
    case 'scrap':
      return 'SCRAP PILE';
    case 'cache':
      return 'SEALED CACHE';
    case 'fabricator':
      return 'FABRICATOR';
    case 'terminal': {
      const kind = w.terminals[t.id]!.kind;
      if (kind === 'data') return 'DATA TERMINAL';
      return w.level.securityUnlocks === 'exit' ? 'UPLINK TERMINAL' : 'SECURITY TERMINAL';
    }
  }
}

function complete(w: World, t: InteractTarget): void {
  const p = w.player;
  const r = CFG.interact.reward;
  if (t.kind === 'fabricator') {
    startCompile(w);
    return;
  }
  if (t.kind === 'cache') {
    openCache(w, t.id);
    return;
  }
  w.stats.hacks += t.kind === 'scrap' ? 0 : 1;
  if (t.kind === 'scrap') {
    w.scrapPiles[t.id]!.taken = true;
    p.scrap += r.scrap;
    w.log(`> salvaged components. +${r.scrap} SCRAP`, 'good');
    return;
  }
  if (t.kind === 'camera') {
    const cam = w.cameras[t.id]!;
    cam.disabled = true;
    cam.seesPlayer = false;
    const gain = Math.round(r.camera * (1 + p.build.mods.data));
    p.data += gain;
    w.log(`> ${cam.name} disabled. +${gain} DATA`, 'good');
    spreadVirus(w, cam);
    return;
  }
  const term = w.terminals[t.id]!;
  term.hacked = true;
  const gain = Math.round(r[term.kind] * (1 + p.build.mods.data));
  p.data += gain;
  spreadVirus(w, center(term));
  if (term.kind === 'data') {
    w.log(`> data cache extracted. +${gain} DATA`, 'good');
  } else if (w.level.securityUnlocks === 'fabricator') {
    if (w.fabricator?.state === 'locked') w.fabricator.state = 'ready';
    w.log(`> SECURITY OVERRIDE. Fabricator powered. +${gain} DATA`, 'good');
  } else {
    w.grid.exitOpen = true;
    w.log(`> UPLINK established. Outflow gate unlocked. +${gain} DATA`, 'good');
  }
}

/** VIRAL set bonus: a finished hack jumps to the nearest live camera. */
function spreadVirus(w: World, from: { x: number; y: number }): void {
  if (!w.player.build.tags.has('VIRAL')) return;
  let best: (typeof w.cameras)[number] | null = null;
  let bestD: number = CFG.modules.viralRange;
  for (const cam of w.cameras) {
    const d = Math.hypot(cam.x - from.x, cam.y - from.y);
    if (!cam.disabled && d > 0.01 && d <= bestD) {
      best = cam;
      bestD = d;
    }
  }
  if (!best) return;
  best.disabled = true;
  best.seesPlayer = false;
  w.log(`> VIRAL: the hack spreads and disables ${best.name}.`, 'good');
}
