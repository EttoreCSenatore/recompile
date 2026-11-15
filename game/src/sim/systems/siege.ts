import { CFG } from '../config';
import { VERSIONS } from '../versions';
import { center, type World } from '../world';

/** Starts the Compile siege. Resources are only spent if the Compile succeeds. */
export function startCompile(w: World): boolean {
  const fab = w.fabricator;
  const p = w.player;
  const next = p.version.next;
  if (!fab || fab.state !== 'ready' || !next || p.data < next.data || p.scrap < next.scrap) return false;
  fab.state = 'compiling';
  fab.progress = 0;
  fab.hp = CFG.compile.fabricatorHp;
  fab.spawnTimer = CFG.compile.firstSpawn;
  w.raiseThreat();
  w.log(`> COMPILE STARTED: ${next.id} ${VERSIONS[next.id].codename}. ${CFG.compile.duration}s to completion.`, 'danger');
  w.log('> The fabricator is broadcasting on every frequency. They are coming. Defend it.', 'danger');
  return true;
}

export function updateSiege(w: World, dt: number): void {
  const fab = w.fabricator;
  if (!fab) return;

  if (fab.state === 'rebooting') {
    fab.rebootTimer -= dt;
    if (fab.rebootTimer <= 0) {
      fab.state = 'ready';
      fab.hp = CFG.compile.fabricatorHp;
      w.log('> Fabricator back online. Your resources are intact. Try again.', 'info');
    }
    return;
  }
  if (fab.state !== 'compiling') return;

  fab.progress += dt;
  fab.spawnTimer -= dt;
  const alive = w.guards.filter((g) => g.siege && g.state !== 'down').length;
  if (fab.spawnTimer <= 0 && alive < CFG.compile.maxAlive) {
    const pt = fab.spawnPoints[fab.nextSpawn % fab.spawnPoints.length]!;
    fab.nextSpawn++;
    const g = w.addGuard('guard', center(pt), { siege: true });
    w.bark(g, '"Hostile machine at the fabricator! Move, move!"', 'danger', true);
    fab.spawnTimer = CFG.compile.spawnEvery;
  }

  if (fab.hp <= 0) {
    fab.hp = 0;
    fab.state = 'rebooting';
    fab.rebootTimer = CFG.compile.rebootTime;
    fab.progress = 0;
    releaseSiegeGuards(w);
    w.log('> FABRICATOR DAMAGED. COMPILE FAILED. Rebooting...', 'danger');
    return;
  }
  if (fab.progress >= CFG.compile.duration) completeCompile(w);
}

function completeCompile(w: World): void {
  const fab = w.fabricator!;
  const p = w.player;
  const next = p.version.next!;
  p.data -= next.data;
  p.scrap -= next.scrap;
  p.version = VERSIONS[next.id];
  p.power = p.version.maxPower;
  // The new body is assembled on the fabricator itself.
  Object.assign(p, center(fab), { inVent: false, interact: null, pounce: null, abilityCooldown: 0 });
  fab.state = 'done';
  w.grid.exitOpen = true;
  w.stats.compiles++;
  releaseSiegeGuards(w);
  w.emit({ type: 'compiled', version: next.id });
  const v = p.version;
  w.log('> COMPILE COMPLETE.', 'good');
  w.log(`> booting ECHO-7 ${v.id} ${v.codename} ... max power ${v.maxPower} · claws ONLINE · vents: chassis too large`, 'good');
  w.log('> empathy_module ............ LOADED', 'good');
  w.log(`> [LMB / SPACE] ${v.attack?.name ?? ''} · [Q] ${v.ability.name} · Exit unlocked.`, 'good');
}

/** Siege attackers stop targeting the fabricator and hunt ECHO instead. */
function releaseSiegeGuards(w: World): void {
  for (const g of w.guards) {
    if (!g.siege || g.state === 'down') continue;
    g.siege = false;
    if (g.state !== 'stunned') {
      g.state = 'alert';
      g.lastSeen = { x: w.player.x, y: w.player.y };
      g.lostSight = 0;
      g.pathGoal = null;
    }
  }
}
