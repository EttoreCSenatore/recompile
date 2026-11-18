/**
 * M2.4 spike: a Three.js renderer that reads the same `World` as the Phaser one.
 * Open `/spike3d.html` (optional `?seed=…&level=undercity&version=v1`).
 * Grid (x, y) maps to Three (x, z); Three's y is up. The camera looks toward -z,
 * so screen-up is grid -y and WASD keeps its 2D meaning.
 *
 * Throwaway-quality on purpose: it exists to answer "is Three.js the right engine?".
 */
import * as THREE from 'three';
import { CFG } from '../sim/config';
import { TILE } from '../sim/grid';
import type { LevelId } from '../sim/levels';
import { castRay } from '../sim/los';
import { parseSeed, randomSeed } from '../sim/rng';
import { NO_INPUT, World, type Guard, type GuardState, type Input } from '../sim/world';
import type { VersionId } from '../sim/versions';
import { Hud } from '../render/hud';

const STEP = 1 / 60;
const WALL_H = 1.7;
const CONE_RAYS = 28;
const CAM_PITCH = THREE.MathUtils.degToRad(52); // Diablo-ish angle
const CAM_DIST = 15;
const WALL_LOW = 0.35; // cut-down height for walls that would hide the player

const params = new URLSearchParams(window.location.search);
const seed = parseSeed(params.get('seed')) ?? randomSeed();
const level = (params.get('level') === 'undercity' ? 'undercity' : 'lab') as LevelId;
const version = (params.get('version') === 'v1' ? 'v1' : 'v0.1') as VersionId;

let world = new World(seed, { startLevel: level, version });
const hud = new Hud();
hud.reset(seed);
hud.setVisible(true);

// ── Renderer, scene, camera ────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.getElementById('game')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020403);
scene.fog = new THREE.Fog(0x020403, 14, 30);

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
const camTarget = new THREE.Vector3();

scene.add(new THREE.HemisphereLight(0x6f8f7a, 0x0a1410, 0.55));
const sun = new THREE.DirectionalLight(0xbfd8c8, 1.1);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.far = 50;
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const glow = new THREE.PointLight(0x39ff6a, 3.5, 8, 1.8); // ECHO's own light
glow.position.y = 1.2;
scene.add(glow);

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ── Static map ─────────────────────────────────────────────────────────────
let mapGroup = new THREE.Group();
let floorMesh: THREE.InstancedMesh;
let wallMesh: THREE.InstancedMesh;
let tileIdx: { floor: number[]; wall: number[] } = { floor: [], wall: [] };
let lastVis: Uint8Array | null = null;
let wallH: number[] = [];
let cutKey = '';
const dyn = new THREE.Group();
scene.add(dyn);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const TILE_COLOR: Record<number, number> = {
  [TILE.FLOOR]: 0x2a4636,
  [TILE.VENT]: 0x1c3b4d,
  [TILE.WATER]: 0x14506b,
  [TILE.EXIT]: 0x39ff6a,
};

function buildMap(): void {
  scene.remove(mapGroup);
  mapGroup.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
  mapGroup = new THREE.Group();
  const g = world.grid;
  const floors: number[] = [];
  const walls: number[] = [];
  for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) (g.get(x, y) === TILE.WALL ? walls : floors).push(g.index(x, y));
  tileIdx = { floor: floors, wall: walls };

  floorMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 }), floors.length);
  wallMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.25 }), walls.length);
  floorMesh.receiveShadow = wallMesh.receiveShadow = true;
  wallMesh.castShadow = true;
  const m = new THREE.Matrix4();
  floors.forEach((i, n) => {
    const x = i % g.width;
    const y = Math.floor(i / g.width);
    const t = g.get(x, y);
    const h = t === TILE.WATER ? 0.05 : t === TILE.VENT ? 0.08 : 0.2;
    m.compose(new THREE.Vector3(x + 0.5, -h / 2, y + 0.5), new THREE.Quaternion(), new THREE.Vector3(0.98, h, 0.98));
    floorMesh.setMatrixAt(n, m);
    floorMesh.setColorAt(n, new THREE.Color(TILE_COLOR[t] ?? 0x2a4636));
  });
  wallH = [];
  walls.forEach((i, n) => {
    const x = i % g.width;
    const y = Math.floor(i / g.width);
    // Deterministic per-tile height jitter so walls read as masonry rather than a flat extrusion.
    const h = WALL_H + (((x * 7 + y * 13) % 5) - 2) * 0.06;
    wallH.push(h);
    m.compose(new THREE.Vector3(x + 0.5, h / 2, y + 0.5), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
    wallMesh.setMatrixAt(n, m);
    wallMesh.setColorAt(n, new THREE.Color(0x5b7566));
  });
  mapGroup.add(floorMesh, wallMesh);

  // Exit door frame.
  const ex = world.level.exit;
  const door = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x5a1414, emissive: 0x5a1414, emissiveIntensity: 0.6 }));
  door.position.set(ex.x + 0.5, 0.9, ex.y + 0.5);
  door.scale.set(0.9, 1.8, 0.9);
  door.name = 'exit';
  mapGroup.add(door);
  scene.add(mapGroup);
  lastVis = null;
  cutKey = '';
}

/** Cutaway: walls between the camera and the player drop low so ECHO is never hidden. Redone when the player changes tile. */
function applyCutaway(): void {
  const px = Math.floor(world.player.x);
  const py = Math.floor(world.player.y);
  const key = `${px},${py}`;
  if (key === cutKey) return;
  cutKey = key;
  const g = world.grid;
  const m = new THREE.Matrix4();
  tileIdx.wall.forEach((i, n) => {
    const x = i % g.width;
    const y = Math.floor(i / g.width);
    const near = Math.abs(x - px) <= 3 && y >= py + 1 && y <= py + 5;
    const h = near ? WALL_LOW : (wallH[n] ?? WALL_H);
    m.compose(new THREE.Vector3(x + 0.5, h / 2, y + 0.5), new THREE.Quaternion(), new THREE.Vector3(1, h, 1));
    wallMesh.setMatrixAt(n, m);
  });
  wallMesh.instanceMatrix.needsUpdate = true;
}

/** Fog of war as per-instance colour: hidden = black, explored-not-visible = dim. */
function applyFog(): void {
  if (lastVis === world.visible) return;
  lastVis = world.visible;
  const g = world.grid;
  const c = new THREE.Color();
  const apply = (mesh: THREE.InstancedMesh, ids: number[], base: (i: number) => number) => {
    ids.forEach((i, n) => {
      const k = world.visible[i] ? 1 : world.explored[i] ? 0.28 : 0;
      c.set(base(i)).multiplyScalar(k);
      mesh.setColorAt(n, c);
    });
    mesh.instanceColor!.needsUpdate = true;
  };
  apply(floorMesh, tileIdx.floor, (i) => TILE_COLOR[g.tiles[i] ?? TILE.FLOOR] ?? 0x2a4636);
  apply(wallMesh, tileIdx.wall, () => 0x5b7566);
}

// ── Entity models (all procedural low-poly) ────────────────────────────────
const mat = (color: number, emissive = 0, ei = 1) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.3, emissive, emissiveIntensity: ei });

function makeEcho(): THREE.Group {
  const grp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.25, 4, 10), mat(0x39ff6a, 0x0b4a1c, 0.8));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.3;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(0xff3b3b, 0xff3b3b, 2));
  eye.position.set(0.3, 0.34, 0);
  grp.add(body, eye);
  if (version === 'v1') {
    for (const [dx, dz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] as const) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 5), mat(0x2fbf55));
      leg.position.set(dx, 0.2, dz);
      grp.add(leg);
    }
  }
  grp.traverse((o) => (o.castShadow = true));
  return grp;
}

function makeGuard(g: Guard): THREE.Group {
  const grp = new THREE.Group();
  const base = g.kind === 'officer' ? 0xd9c24a : 0xe08a4a;
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 10), mat(base));
  torso.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), mat(0xe3c3a0));
  head.position.y = 1.15;
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), mat(0xffffff, 0xffffff, 0.5));
  nose.position.set(0.18, 1.15, 0);
  grp.add(torso, head, nose);
  if (g.kind === 'officer') {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10), mat(0x1b2a4a));
    cap.position.y = 1.3;
    grp.add(cap);
  }
  grp.traverse((o) => (o.castShadow = true));
  grp.userData.torso = torso;
  return grp;
}

const guardMeshes = new Map<number, THREE.Group>();
let echo = makeEcho();
let echoVersion = version;
scene.add(echo);

const staticProps: THREE.Object3D[] = [];
function buildProps(): void {
  for (const o of staticProps) scene.remove(o);
  staticProps.length = 0;
  const add = (o: THREE.Object3D) => {
    o.traverse((c) => (c.castShadow = true));
    scene.add(o);
    staticProps.push(o);
  };
  for (const t of world.terminals) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(boxGeo, mat(0x2b3a33));
    body.scale.set(0.7, 0.9, 0.5);
    body.position.y = 0.45;
    const screen = new THREE.Mesh(boxGeo, mat(0x000000, t.kind === 'security' ? 0xffb000 : 0x39ffd0, 1.6));
    screen.scale.set(0.5, 0.3, 0.05);
    screen.position.set(0, 0.7, 0.26);
    screen.name = 'screen';
    grp.add(body, screen);
    grp.position.set(t.x + 0.5, 0, t.y + 0.5);
    grp.userData.terminal = t;
    add(grp);
  }
  for (const o of world.outlets) {
    const m = new THREE.Mesh(boxGeo, mat(0xffd447, 0xffd447, 0.8));
    m.scale.set(0.2, 0.3, 0.1);
    m.position.set(o.x + 0.5, 0.6, o.y + 0.5);
    add(m);
  }
  for (const s of world.scrapPiles) {
    const grp = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(boxGeo, mat(i % 2 ? 0x8a7a66 : 0xb8a68c));
      b.scale.set(0.2 + 0.05 * i, 0.12 + 0.04 * i, 0.2);
      b.position.set((i - 1.5) * 0.12, 0.08 + (i % 2) * 0.1, ((i * 3) % 3) * 0.08);
      b.rotation.y = i;
      grp.add(b);
    }
    grp.position.set(s.x + 0.5, 0, s.y + 0.5);
    grp.userData.scrap = s;
    add(grp);
  }
  for (const c of world.caches) {
    const m = new THREE.Mesh(boxGeo, mat(0x3a3f4a, 0x6aa8ff, 0.4));
    m.scale.set(0.8, 0.55, 0.6);
    m.position.set(c.x + 0.5, 0.28, c.y + 0.5);
    m.userData.cache = c;
    add(m);
  }
  if (world.workbench) {
    const b = world.workbench;
    const m = new THREE.Mesh(boxGeo, mat(0x4a3a22, 0xffd447, 0.3));
    m.scale.set(0.9, 0.55, 0.7);
    m.position.set(b.x + 0.5, 0.28, b.y + 0.5);
    add(m);
  }
  if (world.fabricator) {
    const f = world.fabricator;
    const grp = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.5, 8), mat(0x223029));
    base.position.y = 0.25;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), mat(0x000000, 0xffb000, 1.6));
    core.position.y = 1.1;
    core.name = 'core';
    grp.add(base, core);
    grp.position.set(f.x + 0.5, 0, f.y + 0.5);
    add(grp);
    grp.userData.fab = true;
  }
}

// Vision cones as a fan mesh rebuilt each frame.
function makeCone(): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CONE_RAYS + 2) * 3), 3));
  const idx: number[] = [];
  for (let i = 1; i <= CONE_RAYS; i++) idx.push(0, i, i + 1);
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  return mesh;
}
function updateCone(mesh: THREE.Mesh, x: number, y: number, facing: number, fov: number, range: number, color: number, opacity: number): void {
  const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  pos.setXYZ(0, x, 0.05, y);
  for (let i = 0; i <= CONE_RAYS; i++) {
    const a = facing - fov / 2 + (fov * i) / CONE_RAYS;
    const len = castRay(world.grid, x, y, a, range);
    pos.setXYZ(i + 1, x + Math.cos(a) * len, 0.05, y + Math.sin(a) * len);
  }
  pos.needsUpdate = true;
  const m = mesh.material as THREE.MeshBasicMaterial;
  m.color.set(color);
  m.opacity = opacity;
  mesh.visible = opacity > 0;
}

const GUARD_CONE: Record<GuardState, [number, number]> = {
  patrol: [0xfff1a8, 0.14],
  suspicious: [0xffb000, 0.22],
  investigate: [0xffb000, 0.18],
  alert: [0xff3b3b, 0.26],
  stunned: [0x6aa8ff, 0],
  down: [0, 0],
};
const cones = new Map<string, THREE.Mesh>();
function cone(key: string): THREE.Mesh {
  let c = cones.get(key);
  if (!c) {
    c = makeCone();
    dyn.add(c);
    cones.set(key, c);
  }
  return c;
}

// ── Input (mirrors the Phaser scene's mapping) ─────────────────────────────
const down = new Set<string>();
const pressed = new Set<string>();
let mouseDown = false;
const mouse = new THREE.Vector2();
let mouseActive = 0;
window.addEventListener('keydown', (e) => {
  down.add(e.code);
  if (!e.repeat) pressed.add(e.code);
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => down.delete(e.code));
renderer.domElement.addEventListener('pointerdown', () => (mouseDown = true));
window.addEventListener('pointerup', () => (mouseDown = false));
renderer.domElement.addEventListener('pointermove', (e) => {
  mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  mouseActive = performance.now() + 3000;
});
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

const ray = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

function readInput(): Input {
  const k = (...c: string[]) => c.some((x) => down.has(x));
  let aim: { x: number; y: number } | null = null;
  if (performance.now() < mouseActive) {
    ray.setFromCamera(mouse, camera);
    if (ray.ray.intersectPlane(ground, hit)) aim = { x: hit.x, y: hit.z };
  }
  return {
    ...NO_INPUT,
    moveX: (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0),
    moveY: (k('KeyS', 'ArrowDown') ? 1 : 0) - (k('KeyW', 'ArrowUp') ? 1 : 0),
    aim,
    sneak: k('ShiftLeft', 'ShiftRight'),
    interact: k('KeyF'),
    attack: k('Space') || mouseDown,
    ability: pressed.delete('KeyQ'),
  };
}

// ── Frame loop ─────────────────────────────────────────────────────────────
function flushEvents(): void {
  for (const e of world.drainEvents()) {
    if (e.type === 'log') hud.log(e.text, e.level);
    else if (e.type === 'level') {
      buildMap();
      buildProps();
    }
  }
}

function sync(now: number): void {
  const p = world.player;
  if (echoVersion !== p.version.id) {
    scene.remove(echo);
    echoVersion = p.version.id;
    echo = makeEcho();
    scene.add(echo);
  }
  const bob = p.moving ? Math.sin(now / 70) * 0.03 : 0;
  echo.position.set(p.x, bob, p.y);
  echo.rotation.y = -p.facing;
  echo.visible = true;
  echo.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && 'transparent' in m) {
      m.transparent = p.inVent;
      m.opacity = p.inVent ? 0.5 : 1;
    }
  });
  glow.position.set(p.x, 1.2, p.y);

  // Guards: create on demand, hide when out of sight (same rule as the 2D renderer).
  const seen = new Set<number>();
  for (const g of world.guards) {
    let m = guardMeshes.get(g.id);
    if (!m) {
      m = makeGuard(g);
      guardMeshes.set(g.id, m);
      dyn.add(m);
    }
    seen.add(g.id);
    m.visible = !!world.visible[world.grid.index(Math.floor(g.x), Math.floor(g.y))];
    m.position.set(g.x, 0, g.y);
    m.rotation.y = -g.facing;
    m.rotation.z = g.state === 'down' ? Math.PI / 2 : 0;
    if (g.state === 'down') m.position.y = 0.2;
    const torso = m.userData.torso as THREE.Mesh;
    const tm = torso.material as THREE.MeshStandardMaterial;
    tm.emissive.set(g.hitFlash > 0 ? 0xffffff : g.state === 'alert' ? 0xff3b3b : g.state === 'stunned' ? 0x6aa8ff : 0x000000);
    tm.emissiveIntensity = g.hitFlash > 0 ? 1 : 0.5;
    const [color, opacity] = GUARD_CONE[g.state];
    updateCone(cone(`g${g.id}`), g.x, g.y, g.facing, CFG.guard.fov, CFG.guard.range, color, opacity);
  }
  for (const [id, m] of guardMeshes) {
    if (!seen.has(id)) {
      dyn.remove(m);
      guardMeshes.delete(id);
    }
  }
  for (const c of world.cameras) {
    const live = !(c.disabled || c.cooldown > 0 || c.emp > 0);
    updateCone(cone(`c${c.id}`), c.x, c.y, c.facing, CFG.camera.fov, CFG.camera.range, c.seesPlayer ? 0xff3b3b : 0x8fd3ff, live ? (c.seesPlayer ? 0.24 : 0.12) : 0);
  }

  // Props whose look depends on state.
  for (const o of staticProps) {
    const t = o.userData.terminal as { hacked: boolean } | undefined;
    if (t) (o.getObjectByName('screen') as THREE.Mesh).visible = !t.hacked;
    const s = o.userData.scrap as { taken: boolean } | undefined;
    if (s) o.visible = !s.taken;
    if (o.userData.fab) {
      const core = o.getObjectByName('core')!;
      core.rotation.y = now / 600;
      core.position.y = 1.1 + Math.sin(now / 400) * 0.1;
    }
  }
  const door = mapGroup.getObjectByName('exit') as THREE.Mesh;
  const dm = door.material as THREE.MeshStandardMaterial;
  dm.color.set(world.grid.exitOpen ? 0x39ff6a : 0x5a1414);
  dm.emissive.set(world.grid.exitOpen ? 0x39ff6a : 0x5a1414);

  // Camera: fixed yaw, orbit pitch, smooth follow.
  camTarget.lerp(new THREE.Vector3(p.x, 0, p.y), 0.12);
  camera.position.set(camTarget.x, camTarget.y + Math.sin(CAM_PITCH) * CAM_DIST, camTarget.z + Math.cos(CAM_PITCH) * CAM_DIST);
  camera.lookAt(camTarget);
  sun.position.set(camTarget.x + 6, 14, camTarget.z + 4);
  sun.target.position.copy(camTarget);
}

buildMap();
buildProps();
camTarget.set(world.player.x, 0, world.player.y);
flushEvents();

let last = performance.now();
let acc = 0;
let fpsT = 0;
let frames = 0;
const fpsEl = document.getElementById('fps');

function frame(t: number): void {
  const dt = Math.min((t - last) / 1000, 0.1);
  last = t;
  if (pressed.delete('KeyR')) {
    world = new World(seed, { startLevel: level, version });
    hud.reset(seed);
    buildMap();
    buildProps();
  }
  if (world.status === 'playing') {
    acc += dt;
    while (acc >= STEP) {
      acc -= STEP;
      world.step(STEP, readInput());
      if (world.status !== 'playing') break;
    }
  }
  flushEvents();
  applyFog();
  applyCutaway();
  sync(t);
  hud.update(world);
  renderer.render(scene, camera);

  frames++;
  fpsT += dt;
  if (fpsT >= 1) {
    if (fpsEl) fpsEl.textContent = `${frames} fps · ${renderer.info.render.calls} draws · ${renderer.info.render.triangles} tris · ${world.status}`;
    frames = 0;
    fpsT = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

declare global {
  interface Window {
    __spike?: { world: () => World; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer };
  }
}
window.__spike = { world: () => world, camera, renderer };
