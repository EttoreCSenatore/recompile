/** Shared tuning values. Distances are in tiles, times in seconds. Per-body stats live in versions.ts. */
export const CFG = {
  player: {
    stepNoiseEvery: 0.35,
    stepNoiseRadius: 1.8,
    ventNoiseRadius: 1.2,
  },
  stun: { range: 1.6, duration: 5, noiseRadius: 3.5 },
  interact: {
    range: 1.3,
    noiseEvery: 0.6,
    noiseRadius: { data: 2, security: 2, camera: 2, scrap: 2.4, fabricator: 0 },
    duration: { data: 2, security: 3, camera: 1.5, scrap: 1, fabricator: 0.5 },
    reward: { data: 10, security: 15, camera: 4, scrap: 8 },
  },
  outlet: { range: 0.8, rate: 5 },
  water: { drain: 3, noiseRadius: 2.5, sneakNoiseRadius: 1.2, guardSlow: 0.7 },
  guard: {
    radius: 0.32,
    fov: (100 * Math.PI) / 180,
    range: 6,
    touchRange: 0.9,
    patrolSpeed: 2.0,
    investigateSpeed: 2.6,
    alertSpeed: 3.4,
    turnRate: 7,
    suspicionDecay: 0.25,
    suspiciousAt: 0.25,
    loseSightAfter: 4,
    lookAroundTime: 3,
    broadcastRadius: 8,
    salvage: 3,
  },
  camera: { fov: (60 * Math.PI) / 180, range: 6, alarmRadius: 14, cooldown: 4 },
  compile: {
    // Tuned so an idle player loses the fabricator (~30 s in) but a player who keeps
    // stunning attackers and recharges at the lobby outlet can hold out (see tests).
    duration: 45,
    fabricatorHp: 150,
    siegeDps: 4,
    attackRange: 1.4,
    firstSpawn: 2,
    spawnEvery: 9,
    maxAlive: 2,
    rebootTime: 5,
  },
  threat: { max: 5, decayEvery: 40, raiseCooldown: 5 },
} as const;
