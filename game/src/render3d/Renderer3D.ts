/**
 * Three.js renderer for RECOMPILE (M2.4). It only reads `World`; it never changes it.
 * Grid (x, y) maps to Three (x, z); Three's y is up. The camera looks toward -z, so
 * screen-up is grid -y and WASD keeps the meaning it had in 2D.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CFG } from '../sim/config';
import { TILE } from '../sim/grid';
import { castRay } from '../sim/los';
import type { GameEvent, Guard, GuardState, World } from '../sim/world';
import { Kit, type PieceName } from './kit';

const WALL_H = 1.7;
const WALL_LOW = 0.35; // cut-down height for walls that would hide ECHO
const CONE_RAYS = 28;
const CAM_PITCH = THREE.MathUtils.degToRad(52); // Diablo-ish angle
const CAM_DIST = 15;
/** The MegaKit's modules are 4 units wide; our tiles are 1. */
const KIT_S = 0.25;
const WALL_PANELS: PieceName[] = ['WallBand_Straight', 'WallAstra_Straight'];
interface Theme {
  floorTint: number;
  coreColor: number;
  /** Decor pieces and the height (world units) each is scaled to; picked per candidate tile. */
  decor: [PieceName, number][];
  /** Share of eligible wall-side tiles that get a prop. */
  density: number;
}

const THEMES: Record<'lab' | 'undercity', Theme> = {
  lab: {
    floorTint: 0x4d6a5b,
    coreColor: 0x6f8579,
    decor: [['Prop_Crate', 0.5], ['Prop_Crate3', 0.5], ['Prop_Locker', 1.25], ['Prop_Shelves_WideShort', 0.8], ['Prop_Ammo_Closed', 0.3], ['Prop_Barrel2_Closed', 0.6], ['Column_Pipes', 1.4]],
    density: 0.4,
  },
  undercity: {
    floorTint: 0x3f4f4a,
    coreColor: 0x56645c,
    decor: [['Prop_Barrel_Large', 0.75], ['Prop_Barrel2_Closed', 0.6], ['Prop_Crate_Tarp', 0.55], ['Prop_Crate', 0.5], ['Column_Pipes', 1.4], ['Column_Pipes', 1.1]],
    density: 0.4,
  },
};

const FLOOR_PIECES: PieceName[] = ['Platform_Simple']; // the kit's DarkPlates and Squares floors render near-black under our lighting
const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const C = {
  red: 0xff3b3b,
  green: 0x39ff6a,
  blue: 0x6aa8ff,
  white: 0xffffff,
  amber: 0xffb000,
  bullet: 0xfff3a0,
};

const TILE_COLOR: Record<number, number> = {
  [TILE.FLOOR]: 0x2a4636,
  [TILE.VENT]: 0x1c3b4d,
  [TILE.WATER]: 0x14506b,
  [TILE.EXIT]: 0x39ff6a,
};
const WALL_COLOR = 0x5b7566;

/** Animation state of a human guard (clips come from the Universal Animation Library). */
interface GuardAnim {
  mixer: THREE.AnimationMixer;
  actions: Record<string, THREE.AnimationAction>;
  current: string;
  px: number;
  py: number;
}

const dist2 = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y);

const ud0 = (m: THREE.Object3D): boolean => !!(m.userData as { anim?: GuardAnim | null }).anim;

const GUARD_CONE: Record<GuardState, [number, number]> = {
  patrol: [0xfff1a8, 0.14],
  suspicious: [C.amber, 0.22],
  investigate: [C.amber, 0.18],
  alert: [C.red, 0.26],
  stunned: [C.blue, 0],
  down: [0, 0],
};

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const mat = (color: number, emissive = 0, ei = 1): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.3, emissive, emissiveIntensity: ei });
const basic = (color: number, opacity = 1): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });

function shadowed<T extends THREE.Object3D>(o: T): T {
  o.traverse((c) => (c.castShadow = true));
  return o;
}

interface Fx {
  obj: THREE.Object3D;
  t: number;
  life: number;
  update: (k: number) => void;
}

export class Renderer3D {
  readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
  private readonly camTarget = new THREE.Vector3();
  private readonly sun = new THREE.DirectionalLight(0xbfd8c8, 1.1);
  private readonly glow = new THREE.PointLight(C.green, 3.5, 8, 1.8);
  private readonly ray = new THREE.Raycaster();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private shake = 0;

  private world!: World;
  private mapGroup = new THREE.Group();
  private floorMesh!: THREE.InstancedMesh;
  private wallMesh!: THREE.InstancedMesh;
  private floorIds: number[] = [];
  private wallIds: number[] = [];
  private wallH: number[] = [];
  private cutKey = '';
  private lastVis: Uint8Array | null = null;
  private exitDoor!: THREE.Object3D;
  private exitMats: THREE.MeshStandardMaterial[] = [];
  private kit: Kit | null = null;
  private theme: Theme = THEMES.lab;
  /** Kit instanced meshes that take the fog colour; `tiles[n]` is the grid tile whose visibility instance n follows. */
  private fogParts: { mesh: THREE.InstancedMesh; tiles: number[] }[] = [];
  private panelSets: { piece: PieceName; defs: { wall: number; face: number; fogTile: number }[]; meshes: THREE.InstancedMesh[] }[] = [];

  private readonly dyn = new THREE.Group();
  private props: THREE.Object3D[] = [];
  private echo: THREE.Group;
  private echoVersion = '';
  private echoGhost = false;
  private echoAnim: { mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; current: string; attackUntil: number } | null = null;
  private lastAttackCd = 0;
  private dt = 0;
  private readonly guards = new Map<number, THREE.Group>();
  private readonly cones = new Map<string, THREE.Mesh>();
  private readonly pickups = new Map<number, THREE.Mesh>();
  private bullets: THREE.Mesh[] = [];
  private readonly bulletGeo = new THREE.SphereGeometry(0.09, 6, 6);
  private readonly bulletMat = new THREE.MeshBasicMaterial({ color: C.bullet });
  private fx: Fx[] = [];
  private telegraph!: THREE.Line;
  private echoRings!: { sneak: THREE.Mesh; charge: THREE.Mesh; interact: THREE.Mesh };
  private fabRing!: THREE.Mesh;

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.canvas = this.renderer.domElement;
    parent.appendChild(this.canvas);

    // Metallic kit materials render black without an environment to reflect, so give them a dim one.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.7;
    this.scene.background = new THREE.Color(0x020403);
    this.scene.fog = new THREE.Fog(0x020403, 14, 30);
    this.scene.add(new THREE.HemisphereLight(0x6f8f7a, 0x0a1410, 0.55));
    const s = this.sun;
    s.castShadow = true;
    s.shadow.mapSize.set(2048, 2048);
    Object.assign(s.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, far: 50 });
    s.shadow.bias = -0.0005;
    this.scene.add(s, s.target, this.glow, this.dyn);

    this.echo = new THREE.Group();
    this.scene.add(this.echo);

    const ringMat = (color: number) => basic(color, 0.5);
    const flat = (g: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.06;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    };
    this.echoRings = {
      sneak: flat(new THREE.RingGeometry(0.5, 0.54, 32), ringMat(C.green)),
      charge: flat(new THREE.RingGeometry(0.58, 0.64, 32), basic(0xffd447, 0.8)),
      interact: flat(new THREE.RingGeometry(0.68, 0.78, 32, 1, 0, 1), basic(C.green, 0.9)),
    };
    this.fabRing = flat(new THREE.RingGeometry(1.0, 1.1, 48, 1, 0, 1), basic(C.green, 0.9));
    this.telegraph = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: C.red, transparent: true }));
    this.telegraph.frustumCulled = false;
    this.telegraph.visible = false;
    this.scene.add(this.telegraph);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /** World position under a pointer (normalised device coords), or null if it misses the ground. */
  pick(ndcX: number, ndcY: number): { x: number; y: number } | null {
    this.ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const hit = new THREE.Vector3();
    return this.ray.ray.intersectPlane(this.ground, hit) ? { x: hit.x, y: hit.z } : null;
  }

  // ── Level ────────────────────────────────────────────────────────────────

  /** Loads the MegaKit models. On failure the renderer keeps using its procedural boxes. */
  async loadKit(): Promise<void> {
    try {
      this.kit = await Kit.load();
    } catch (e) {
      console.warn('MegaKit failed to load; using procedural models', e);
      this.kit = null;
    }
  }

  /** Rebuilds everything that depends on the kit once it has loaded (level pieces, props, ECHO and the guards). */
  refreshModels(): void {
    if (!this.kit || !this.world) return;
    for (const g of this.guards.values()) this.dyn.remove(g);
    this.guards.clear();
    this.scene.remove(this.echo);
    this.echoVersion = ''; // makes the next sync build ECHO again
    this.buildLevel();
  }

  setWorld(w: World): void {
    this.world = w;
    this.clearDynamic();
    this.buildLevel();
  }

  private clearDynamic(): void {
    for (const f of this.fx) this.dyn.remove(f.obj);
    this.fx = [];
    for (const g of this.guards.values()) this.dyn.remove(g);
    this.guards.clear();
    for (const c of this.cones.values()) this.dyn.remove(c);
    this.cones.clear();
    for (const p of this.pickups.values()) this.dyn.remove(p);
    this.pickups.clear();
    for (const b of this.bullets) this.dyn.remove(b);
    this.bullets = [];
  }

  /** Rebuilds static geometry and props; call when a new sector loads. */
  buildLevel(): void {
    const w = this.world;
    // Guard ids restart per level, so meshes from the previous level must not be reused.
    this.clearDynamic();
    this.scene.remove(this.mapGroup);
    this.mapGroup.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    this.mapGroup = new THREE.Group();
    this.theme = THEMES[w.level.id];
    const g = w.grid;
    this.floorIds = [];
    this.wallIds = [];
    for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) (g.get(x, y) === TILE.WALL ? this.wallIds : this.floorIds).push(g.index(x, y));

    this.floorMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1 }), this.floorIds.length);
    this.wallMesh = new THREE.InstancedMesh(boxGeo, new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0.25 }), this.wallIds.length);
    this.floorMesh.receiveShadow = this.wallMesh.receiveShadow = true;
    this.wallMesh.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    this.floorIds.forEach((i, n) => {
      const x = i % g.width;
      const y = Math.floor(i / g.width);
      const t = g.get(x, y);
      const h = t === TILE.WATER ? 0.05 : t === TILE.VENT ? 0.08 : 0.2;
      m.compose(new THREE.Vector3(x + 0.5, -h / 2, y + 0.5), q, new THREE.Vector3(0.98, h, 0.98));
      this.floorMesh.setMatrixAt(n, m);
      this.floorMesh.setColorAt(n, new THREE.Color(TILE_COLOR[t] ?? TILE_COLOR[TILE.FLOOR]));
    });
    this.wallH = [];
    this.wallIds.forEach((i, n) => {
      const x = i % g.width;
      const y = Math.floor(i / g.width);
      // Deterministic per-tile height jitter so walls read as masonry rather than a flat extrusion.
      const h = WALL_H + (((x * 7 + y * 13) % 5) - 2) * 0.06;
      this.wallH.push(h);
      m.compose(new THREE.Vector3(x + 0.5, h / 2, y + 0.5), q, new THREE.Vector3(1, h, 1));
      this.wallMesh.setMatrixAt(n, m);
      this.wallMesh.setColorAt(n, new THREE.Color(WALL_COLOR));
    });
    this.mapGroup.add(this.floorMesh, this.wallMesh);
    this.fogParts = [];
    this.panelSets = [];
    if (this.kit) this.buildKitLevel();

    const ex = w.level.exit;
    if (this.kit) {
      this.exitDoor = this.kit.clone('Door_Metal');
      this.exitDoor.scale.set(0.24, 0.42, 0.24); // 4.2 x 4.05 -> about 1 x 1.7
      this.exitDoor.position.set(ex.x + 0.5, 0, ex.y + 0.5);
      this.exitMats = [];
      this.exitDoor.traverse((o) => {
        const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (mm) this.exitMats.push(mm);
      });
    } else {
      const box = new THREE.Mesh(boxGeo, mat(0x5a1414, 0x5a1414, 0.6));
      box.position.set(ex.x + 0.5, 0.9, ex.y + 0.5);
      box.scale.set(0.9, 1.8, 0.9);
      this.exitDoor = box;
      this.exitMats = [box.material as THREE.MeshStandardMaterial];
    }
    this.mapGroup.add(this.exitDoor);
    this.scene.add(this.mapGroup);
    this.lastVis = null;
    this.cutKey = '';
    this.buildProps();
    this.camTarget.set(w.player.x, 0, w.player.y);
  }

  /** Replaces the plain boxes with MegaKit floor platforms and wall panels (boxes stay as the solid core). */
  private buildKitLevel(): void {
    const kit = this.kit!;
    const g = this.world.grid;
    const hash = (x: number, y: number) => Math.abs((x * 73856093) ^ (y * 19349663));
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const place = (x: number, y: number, rotY: number, sx: number, sy: number) =>
      new THREE.Matrix4().compose(new THREE.Vector3(x, 0, y), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(sx, sy, sx));

    // Floors: FLOOR and VENT tiles get a platform; the box stays only for water and the exit.
    const byPiece = new Map<PieceName, { tiles: number[]; at: THREE.Matrix4[] }>();
    this.floorIds.forEach((i, n) => {
      const x = i % g.width;
      const y = Math.floor(i / g.width);
      const t = g.get(x, y);
      if (t !== TILE.FLOOR && t !== TILE.VENT) return;
      this.floorMesh.setMatrixAt(n, zero);
      const piece = FLOOR_PIECES[hash(x, y) % FLOOR_PIECES.length]!;
      const set = byPiece.get(piece) ?? { tiles: [], at: [] };
      set.tiles.push(i);
      set.at.push(place(x + 0.5, y + 0.5, (hash(y, x) % 4) * (Math.PI / 2), KIT_S, KIT_S));
      byPiece.set(piece, set);
      if (t === TILE.VENT) {
        const grate = byPiece.get('Prop_Vent_Small') ?? { tiles: [], at: [] };
        grate.tiles.push(i);
        grate.at.push(place(x + 0.5, y + 0.5, 0, 0.5, 0.5).multiply(new THREE.Matrix4().makeTranslation(0, 0.02, 0)));
        byPiece.set('Prop_Vent_Small', grate);
      }
    });
    this.floorMesh.instanceMatrix.needsUpdate = true;
    for (const [piece, set] of byPiece) {
      for (const mesh of kit.instance(piece, set.at)) {
        // The kit's floors are pale; tint them toward the lab's dim green so they don't blow out under ECHO's light.
        if (piece !== 'Prop_Vent_Small') (mesh.material as THREE.MeshStandardMaterial).color.set(this.theme.floorTint);
        this.mapGroup.add(mesh);
        this.fogParts.push({ mesh, tiles: set.tiles });
      }
    }

    // Wall panels on every face that borders open floor. Faces: 0 east, 1 west, 2 south, 3 north.
    const defsByPiece = new Map<PieceName, { wall: number; face: number; fogTile: number }[]>();
    this.wallIds.forEach((i, n) => {
      const x = i % g.width;
      const y = Math.floor(i / g.width);
      const dirs: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      dirs.forEach(([dx, dy], face) => {
        if (g.get(x + dx, y + dy) === TILE.WALL || !g.inBounds(x + dx, y + dy)) return;
        const piece = WALL_PANELS[hash(x + face, y) % WALL_PANELS.length]!;
        const list = defsByPiece.get(piece) ?? [];
        list.push({ wall: n, face, fogTile: g.index(x + dx, y + dy) });
        defsByPiece.set(piece, list);
      });
    });
    for (const [piece, defs] of defsByPiece) {
      const meshes = kit.instance(piece, defs.map(() => zero));
      for (const mesh of meshes) {
        (mesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        this.mapGroup.add(mesh);
        this.fogParts.push({ mesh, tiles: defs.map((d) => d.fogTile) });
      }
      this.panelSets.push({ piece, defs, meshes });
    }
    this.placePanels((n) => this.wallH[n] ?? WALL_H);
    // The box core is a dark filler behind the panels.
    this.wallMesh.material = new THREE.MeshStandardMaterial({ color: this.theme.coreColor, roughness: 0.8, metalness: 0.2 });
  }

  /** Positions the wall panels; `heightOf(wallIndex)` lets the cutaway lower them. */
  private placePanels(heightOf: (wall: number) => number): void {
    const kit = this.kit!;
    const g = this.world.grid;
    const m = new THREE.Matrix4();
    const rot = [0, Math.PI, -Math.PI / 2, Math.PI / 2];
    for (const set of this.panelSets) {
      const parts = kit.get(set.piece);
      const rawH = kit.height(set.piece);
      set.defs.forEach((d, i) => {
        const id = this.wallIds[d.wall]!;
        const x = id % g.width;
        const y = Math.floor(id / g.width);
        const cx = d.face === 0 ? x + 1 : d.face === 1 ? x : x + 0.5;
        const cz = d.face === 2 ? y + 1 : d.face === 3 ? y : y + 0.5;
        const placement = new THREE.Matrix4().compose(
          new THREE.Vector3(cx, 0, cz),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot[d.face]!),
          new THREE.Vector3(KIT_S, heightOf(d.wall) / rawH, KIT_S),
        );
        set.meshes.forEach((mesh, k) => mesh.setMatrixAt(i, m.multiplyMatrices(placement, parts[k]!.matrix)));
      });
      for (const mesh of set.meshes) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Visual-only clutter against walls so the map reads as a place. It never changes gameplay, so it stays
   * clear of every gameplay object and only goes on tiles with a single wall side (never in 1-wide corridors).
   */
  private placeDecor(add: (o: THREE.Object3D, tile: { x: number; y: number }, data: Record<string, unknown>) => void): void {
    const kit = this.kit!;
    const w = this.world;
    const g = w.grid;
    const keepClear = new Set<number>();
    const mark = (x: number, y: number, r = 1) => {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) keepClear.add(g.index(Math.floor(x) + dx, Math.floor(y) + dy));
    };
    mark(w.player.x, w.player.y, 2);
    mark(w.level.exit.x, w.level.exit.y, 1);
    for (const t of w.terminals) mark(t.x, t.y);
    for (const o of w.outlets) mark(o.x, o.y);
    for (const s of w.scrapPiles) mark(s.x, s.y);
    for (const c of w.caches) mark(c.x, c.y);
    for (const c of w.cameras) mark(c.x, c.y);
    if (w.workbench) mark(w.workbench.x, w.workbench.y);
    if (w.fabricator) {
      mark(w.fabricator.x, w.fabricator.y, 3);
      for (const sp of w.fabricator.spawnPoints) mark(sp.x, sp.y);
    }
    for (const gd of w.guards) {
      mark(gd.x, gd.y);
      for (const r of gd.route) mark(r.x, r.y);
    }
    for (const pk of w.modulePickups) mark(pk.x, pk.y);

    const hash = (x: number, y: number, k: number) => {
      let h = (x * 374761393 + y * 668265263 + k * 2147483647 + w.seed * 1274126177) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const dirs: [number, number, number][] = [[1, 0, -Math.PI / 2], [-1, 0, Math.PI / 2], [0, 1, Math.PI], [0, -1, 0]]; // wall side, yaw so the front faces away
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        if (g.get(x, y) !== TILE.FLOOR || keepClear.has(g.index(x, y))) continue;
        const walls = dirs.filter(([dx, dy]) => g.get(x + dx, y + dy) === TILE.WALL);
        if (walls.length !== 1 || hash(x, y, 1) > this.theme.density) continue;
        // The tile across from the wall must also be open floor so the prop never narrows a passage to nothing.
        const [dx, dy, yaw] = walls[0]!;
        if (g.get(x - dx, y - dy) !== TILE.FLOOR || g.get(x - dx * 2, y - dy * 2) === TILE.WALL) continue;
        const [name, height] = this.theme.decor[Math.floor(hash(x, y, 2) * this.theme.decor.length)]!;
        const box = kit.bounds(name);
        const sz = box.getSize(new THREE.Vector3());
        const s = height / sz.y;
        if (Math.max(sz.x, sz.z) * s > 0.95) continue;
        const obj = kit.clone(name);
        obj.scale.setScalar(s);
        obj.rotation.y = yaw + (hash(x, y, 3) - 0.5) * 0.25;
        const shift = 0.46 + box.min.z * s; // back of the piece against the wall face
        obj.position.set(x + 0.5 + dx * shift, 0, y + 0.5 + dy * shift);
        add(obj, { x, y }, {});
      }
    }
  }

  private buildProps(): void {
    const w = this.world;
    for (const o of this.props) this.scene.remove(o);
    this.props = [];
    const add = (o: THREE.Object3D, tile: { x: number; y: number }, data: Record<string, unknown>) => {
      shadowed(o);
      o.userData = { ...o.userData, ...data, tile: w.grid.index(Math.floor(tile.x), Math.floor(tile.y)) };
      this.scene.add(o);
      this.props.push(o);
    };
    if (this.kit) this.placeDecor(add);
    for (const t of w.terminals) {
      if (this.kit) {
        const comp = this.kit.clone('Prop_Computer');
        comp.scale.setScalar(0.5);
        comp.position.set(t.x + 0.5, 0, t.y + 0.5);
        const screens: THREE.MeshStandardMaterial[] = [];
        comp.traverse((o) => {
          const mm = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (mm?.name.includes('Screen')) screens.push(mm);
        });
        add(comp, t, { terminal: t, screens });
        continue;
      }
      const grp = new THREE.Group();
      const body = new THREE.Mesh(boxGeo, mat(0x2b3a33));
      body.scale.set(0.7, 0.9, 0.5);
      body.position.y = 0.45;
      const screen = new THREE.Mesh(boxGeo, mat(0x000000, t.kind === 'security' ? C.amber : 0x39ffd0, 1.6));
      screen.scale.set(0.5, 0.3, 0.05);
      screen.position.set(0, 0.7, 0.26);
      screen.name = 'screen';
      grp.add(body, screen);
      grp.position.set(t.x + 0.5, 0, t.y + 0.5);
      add(grp, t, { terminal: t });
    }
    for (const o of w.outlets) {
      const m = new THREE.Mesh(boxGeo, mat(0xffd447, 0xffd447, 0.8));
      m.scale.set(0.2, 0.3, 0.1);
      m.position.set(o.x + 0.5, 0.6, o.y + 0.5);
      add(m, o, {});
    }
    for (const s of w.scrapPiles) {
      const grp = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(boxGeo, mat(i % 2 ? 0x8a7a66 : 0xb8a68c));
        b.scale.set(0.2 + 0.05 * i, 0.12 + 0.04 * i, 0.2);
        b.position.set((i - 1.5) * 0.12, 0.08 + (i % 2) * 0.1, ((i * 3) % 3) * 0.08);
        b.rotation.y = i;
        grp.add(b);
      }
      grp.position.set(s.x + 0.5, 0, s.y + 0.5);
      add(grp, s, { scrap: s });
    }
    for (const c of w.caches) {
      if (this.kit) {
        const chest = this.kit.clone('Prop_Chest');
        chest.scale.setScalar(0.45);
        chest.position.set(c.x + 0.5, 0, c.y + 0.5);
        add(chest, c, { cache: c });
        continue;
      }
      const m = new THREE.Mesh(boxGeo, mat(0x3a3f4a, C.blue, 0.4));
      m.scale.set(0.8, 0.55, 0.6);
      m.position.set(c.x + 0.5, 0.28, c.y + 0.5);
      add(m, c, { cache: c });
    }
    if (w.workbench && this.kit) {
      const b = w.workbench;
      const holder = this.kit.clone('Prop_ItemHolder');
      holder.position.set(b.x + 0.5, 0, b.y + 0.5);
      add(holder, b, { bench: b });
    } else if (w.workbench) {
      const b = w.workbench;
      const m = new THREE.Mesh(boxGeo, mat(0x4a3a22, 0xffd447, 0.3));
      m.scale.set(0.9, 0.55, 0.7);
      m.position.set(b.x + 0.5, 0.28, b.y + 0.5);
      add(m, b, { bench: b });
    }
    if (w.fabricator) {
      const f = w.fabricator;
      const grp = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.5, 8), mat(0x223029));
      base.position.y = 0.25;
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), mat(0x000000, C.amber, 1.6));
      core.position.y = 1.1;
      core.name = 'core';
      grp.add(base, core);
      grp.position.set(f.x + 0.5, 0, f.y + 0.5);
      add(grp, f, { fab: true });
    }
  }

  // ── Models ───────────────────────────────────────────────────────────────

  /** SCRAPPER as the animated QuadShell robot, or null when the model isn't available. */
  private makeQuadEcho(): THREE.Group | null {
    const quad = this.kit?.quad;
    if (!quad) return null;
    const grp = new THREE.Group();
    const model = cloneSkinned(quad.scene);
    model.scale.setScalar(0.55);
    model.rotation.y = Math.PI / 2; // the model faces +z; our facing axis is +x
    const mats: THREE.MeshStandardMaterial[] = [];
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // skinned bounds are not updated by the animation
      m.material = (m.material as THREE.MeshStandardMaterial).clone();
      mats.push(m.material as THREE.MeshStandardMaterial);
    });
    grp.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const clip of quad.animations) actions[clip.name] = mixer.clipAction(clip);
    actions.Idle?.play();
    this.echoAnim = { mixer, actions, current: 'Idle', attackUntil: 0 };
    grp.userData.flash = (on: boolean) => mats.forEach((m) => m.color.set(on ? 0xff7070 : 0xffffff));
    return shadowed(grp);
  }

  /** DUSTMITE: a hand-built low-poly cleaning robot (disc body, bumper, lidar dome, side brushes, one red eye). */
  private makeDustmite(): THREE.Group {
    const grp = new THREE.Group();
    const shell = mat(0x3d5648, 0x0b2a16, 0.5);
    const accent = mat(C.green, C.green, 1.2);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.33, 0.13, 28), shell);
    body.position.y = 0.11;
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 6, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    top.scale.y = 0.28;
    top.position.y = 0.175;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.014, 8, 40), accent);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.13;
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.03, 8, 20, Math.PI), mat(0x1c2622));
    bumper.rotation.x = Math.PI / 2;
    bumper.rotation.z = -Math.PI / 2; // the arc covers the front (+x)
    bumper.position.y = 0.09;
    const lidar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 14), mat(0x1c2622));
    lidar.position.set(-0.05, 0.25, 0);
    const lidarGlow = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 16), accent);
    lidarGlow.rotation.x = Math.PI / 2;
    lidarGlow.position.set(-0.05, 0.27, 0);
    const eyeMat = mat(0x2a0505, C.red, 2.2);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), eyeMat);
    eye.position.set(0.24, 0.19, 0);
    const brushes = new THREE.Group();
    for (const side of [-1, 1]) {
      const brush = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const bristle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.025), mat(0xffd447, 0xffd447, 0.4));
        bristle.rotation.y = (i * Math.PI * 2) / 3;
        bristle.position.set(0, 0, 0);
        bristle.translateX(0.07);
        brush.add(bristle);
      }
      brush.position.set(0.22, 0.035, side * 0.27);
      brushes.add(brush);
    }
    grp.add(body, top, ring, bumper, lidar, lidarGlow, eye, brushes);
    grp.userData.brush = brushes;
    grp.userData.flash = (on: boolean) => {
      shell.emissive.set(on ? C.red : 0x0b2a16);
      shell.emissiveIntensity = on ? 1.4 : 0.5;
    };
    return shadowed(grp);
  }

  private makeEcho(v1: boolean): THREE.Group {
    this.echoAnim = null;
    if (v1) {
      const quad = this.makeQuadEcho();
      if (quad) return quad;
    }
    void v1;
    return this.makeDustmite();
  }

  /** A rigged human (Quaternius Superhero body) in a flat uniform colour, plus its animation mixer. */
  private makeHumanGuard(g: Guard): { body: THREE.Group; suit: THREE.MeshStandardMaterial; anim: GuardAnim } | null {
    const humans = this.kit?.humans;
    if (!humans) return null;
    const src = g.kind === 'officer' ? humans.female : humans.male;
    const model = cloneSkinned(src.scene);
    const height = new THREE.Box3().setFromObject(src.scene).getSize(new THREE.Vector3()).y || 1.8;
    model.scale.setScalar(1.35 / height);
    model.rotation.y = Math.PI / 2; // the model faces +z; our facing axis is +x
    let suit: THREE.MeshStandardMaterial | null = null;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false; // skinned bounds are not updated by the animation
      const mm = (m.material as THREE.MeshStandardMaterial).clone();
      if (mm.name.includes('Superhero')) {
        mm.map = null; // flat uniform colour instead of the dark suit texture
        mm.color.set(g.kind === 'officer' ? 0xd9c24a : 0xe08a4a);
        suit = mm;
      }
      m.material = mm;
    });
    if (!suit) return null;
    const body = new THREE.Group();
    body.add(model);
    shadowed(body);
    const mixer = new THREE.AnimationMixer(model);
    const actions: Record<string, THREE.AnimationAction> = {};
    for (const clip of humans.clips) actions[clip.name] = mixer.clipAction(clip);
    return { body, suit, anim: { mixer, actions, current: '', px: g.x, py: g.y } };
  }

  /** Hunter drone: the animated EyeDrone, or a glowing sphere with an eye if the model isn't loaded. */
  private makeDroneBody(): { body: THREE.Group; tint: (color: number, intensity: number) => void; anim: GuardAnim | null } {
    const body = new THREE.Group();
    const mats: THREE.MeshStandardMaterial[] = [];
    let anim: GuardAnim | null = null;
    const src = this.kit?.drone;
    if (src) {
      const model = cloneSkinned(src.scene);
      model.scale.setScalar(0.5);
      model.rotation.y = Math.PI / 2; // faces +z in the file; our facing axis is +x
      model.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false;
        m.material = (m.material as THREE.MeshStandardMaterial).clone();
        mats.push(m.material as THREE.MeshStandardMaterial);
      });
      body.add(model);
      const mixer = new THREE.AnimationMixer(model);
      const actions: Record<string, THREE.AnimationAction> = {};
      for (const clip of src.animations) actions[clip.name] = mixer.clipAction(clip);
      anim = { mixer, actions, current: '', px: 0, py: 0 };
    } else {
      const shell = mat(0x2a3138, 0x000000, 0.5);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), shell);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), mat(C.red, C.red, 2));
      eye.position.x = 0.2;
      body.add(ball, eye);
      mats.push(shell);
    }
    shadowed(body);
    const tint = (color: number, intensity: number) =>
      mats.forEach((m) => {
        m.emissive.set(color);
        m.emissiveIntensity = intensity;
      });
    return { body, tint, anim };
  }

  private makeGuard(g: Guard): THREE.Group {
    const grp = new THREE.Group();
    const drone = g.kind === 'drone' ? this.makeDroneBody() : null;
    const human = drone ? null : this.makeHumanGuard(g);
    let body: THREE.Group;
    let tint: (color: number, intensity: number) => void;
    if (drone) {
      body = drone.body;
      tint = drone.tint;
    } else if (human) {
      body = human.body;
      tint = (color, intensity) => {
        human.suit.emissive.set(color);
        human.suit.emissiveIntensity = intensity;
      };
    } else {
      body = new THREE.Group();
      const torsoMat = mat(g.kind === 'officer' ? 0xd9c24a : 0xe08a4a);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 4, 10), torsoMat);
      torso.position.y = 0.55;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 10), mat(0xe3c3a0));
      head.position.y = 1.15;
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), mat(C.white, C.white, 0.5));
      nose.position.set(0.18, 1.15, 0);
      body.add(torso, head, nose);
      if (g.kind === 'officer') {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 10), mat(0x1b2a4a));
        cap.position.y = 1.3;
        body.add(cap);
      }
      shadowed(body);
      tint = (color, intensity) => {
        torsoMat.emissive.set(color);
        torsoMat.emissiveIntensity = intensity;
      };
    }
    grp.add(body);
    // Status bars live outside the rotating body so they always face the camera.
    const bars = new THREE.Group();
    const bar = (color: number, y: number) => {
      const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.1), basic(0x000000, 0.6));
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.1), basic(color, 1));
      fill.position.z = 0.001;
      const b = new THREE.Group();
      b.add(bg, fill);
      b.position.y = y;
      b.visible = false;
      bars.add(b);
      return { group: b, fill };
    };
    bars.rotation.x = -CAM_PITCH;
    grp.add(bars);
    grp.userData = { body, tint, anim: human?.anim ?? drone?.anim ?? null, sus: bar(C.amber, 1.55), hp: bar(C.red, 1.7), bars };
    return grp;
  }

  // ── Vision cones ─────────────────────────────────────────────────────────

  private cone(key: string): THREE.Mesh {
    let c = this.cones.get(key);
    if (!c) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((CONE_RAYS + 2) * 3), 3));
      const idx: number[] = [];
      for (let i = 1; i <= CONE_RAYS; i++) idx.push(0, i, i + 1);
      geo.setIndex(idx);
      c = new THREE.Mesh(geo, basic(C.white, 0.2));
      c.frustumCulled = false;
      this.dyn.add(c);
      this.cones.set(key, c);
    }
    return c;
  }

  private updateCone(key: string, x: number, y: number, facing: number, fov: number, range: number, color: number, opacity: number): void {
    const mesh = this.cone(key);
    mesh.visible = opacity > 0;
    if (!mesh.visible) return;
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    pos.setXYZ(0, x, 0.05, y);
    for (let i = 0; i <= CONE_RAYS; i++) {
      const a = facing - fov / 2 + (fov * i) / CONE_RAYS;
      const len = castRay(this.world.grid, x, y, a, range);
      pos.setXYZ(i + 1, x + Math.cos(a) * len, 0.05, y + Math.sin(a) * len);
    }
    pos.needsUpdate = true;
    const m = mesh.material as THREE.MeshBasicMaterial;
    m.color.set(color);
    m.opacity = opacity;
  }

  // ── Effects ──────────────────────────────────────────────────────────────

  /** Turns a sim event into a short-lived visual (log lines and level changes are the caller's job). */
  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'noise':
        this.ringFx(e.x, e.y, e.r, 0.6, C.green);
        break;
      case 'stun':
        this.ringFx(e.x, e.y, 1.3, 0.45, C.blue);
        break;
      case 'zap':
        this.ringFx(e.x, e.y, 0.8, 0.3, C.red);
        break;
      case 'hit':
        this.ringFx(e.x, e.y, 0.9, 0.25, C.white);
        this.addShake(0.12);
        break;
      case 'kill':
        this.ringFx(e.x, e.y, 1.8, 0.45, C.amber);
        this.ringFx(e.x, e.y, 1.1, 0.3, C.white);
        this.addShake(0.25);
        break;
      case 'hurt':
        this.ringFx(e.x, e.y, 0.9, 0.3, C.red);
        this.addShake(Math.min(0.3, 0.08 + e.amount * 0.02));
        this.pulseClass('hurt');
        break;
      case 'dash':
        this.dashTrail(e.x, e.y, e.facing);
        break;
      case 'xp':
        this.ringFx(e.x, e.y, 0.6, 0.3, 0xffd447);
        break;
      case 'levelup': {
        const p = this.world.player;
        this.ringFx(p.x, p.y, 3.2, 0.7, 0xffd447);
        this.ringFx(p.x, p.y, 2.0, 0.5, C.white);
        this.pulseClass('levelup');
        this.addShake(0.2);
        break;
      }
      case 'slash': {
        const geo = new THREE.RingGeometry(e.range - 0.06, e.range, 20, 1, -0.9, 1.8);
        const mesh = new THREE.Mesh(geo, basic(C.white, 0.9));
        mesh.rotation.x = -Math.PI / 2;
        const holder = new THREE.Group(); // yaw so the arc is centred on the facing direction
        holder.rotation.y = -e.facing;
        holder.position.set(e.x, 0.3, e.y);
        holder.add(mesh);
        this.addFx(holder, 0.15, (k) => ((mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k)));
        break;
      }
      case 'shot': {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(e.x, 0.5, e.y), new THREE.Vector3(e.tx, 0.5, e.ty)]),
          new THREE.LineBasicMaterial({ color: C.bullet, transparent: true }),
        );
        this.addFx(line, 0.08, (k) => ((line.material as THREE.LineBasicMaterial).opacity = 0.8 * (1 - k)));
        break;
      }
      case 'compiled':
        this.pulseClass('flash');
        this.addShake(0.35);
        break;
      default:
        break;
    }
  }

  private addShake(amount: number): void {
    if (!REDUCED_MOTION) this.shake = Math.max(this.shake, amount);
  }

  /** Restarts a one-shot CSS animation on <body> (compile flash, damage vignette). */
  private pulseClass(name: string): void {
    document.body.classList.remove(name);
    void document.body.offsetWidth;
    document.body.classList.add(name);
  }

  /** A fading streak of green ghosts behind a dash. */
  private dashTrail(x: number, y: number, facing: number): void {
    for (let i = 0; i < 4; i++) {
      const ghost = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), basic(C.green, 0.35));
      ghost.rotation.x = -Math.PI / 2;
      ghost.position.set(x + Math.cos(facing) * i * 0.55, 0.07, y + Math.sin(facing) * i * 0.55);
      const start = 0.35 - i * 0.06;
      this.addFx(ghost, 0.22 + i * 0.03, (k) => ((ghost.material as THREE.MeshBasicMaterial).opacity = start * (1 - k)));
    }
  }

  private ringFx(x: number, y: number, r: number, life: number, color: number): void {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 40), basic(color, 0.5));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.08, y);
    this.addFx(mesh, life, (k) => {
      mesh.scale.setScalar(Math.max(0.01, r * k));
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
    });
  }

  private addFx(obj: THREE.Object3D, life: number, update: (k: number) => void): void {
    this.dyn.add(obj);
    this.fx.push({ obj, t: 0, life, update });
  }

  // ── Per-frame sync ───────────────────────────────────────────────────────

  render(dt: number, nowMs: number): void {
    this.dt = dt;
    this.updateFog();
    this.updateCutaway();
    this.syncEntities(nowMs);
    this.updateFx(dt);
    this.updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  private tileSeen(x: number, y: number, includeExplored = false): boolean {
    const i = this.world.grid.index(Math.floor(x), Math.floor(y));
    return !!this.world.visible[i] || (includeExplored && !!this.world.explored[i]);
  }

  /** Fog of war as per-instance colour: unexplored = black, explored-not-visible = dim. Only redone when visibility changes. */
  private updateFog(): void {
    const w = this.world;
    if (this.lastVis === w.visible) return;
    this.lastVis = w.visible;
    const g = w.grid;
    const c = new THREE.Color();
    const apply = (mesh: THREE.InstancedMesh, ids: number[], base: (i: number) => number) => {
      ids.forEach((i, n) => {
        c.set(base(i)).multiplyScalar(w.visible[i] ? 1 : w.explored[i] ? 0.28 : 0);
        mesh.setColorAt(n, c);
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    apply(this.floorMesh, this.floorIds, (i) => TILE_COLOR[g.tiles[i] ?? TILE.FLOOR] ?? TILE_COLOR[TILE.FLOOR]!);
    apply(this.wallMesh, this.wallIds, () => WALL_COLOR);
    for (const part of this.fogParts) {
      part.tiles.forEach((i, n) => {
        const k = w.visible[i] ? 1 : w.explored[i] ? 0.28 : 0;
        part.mesh.setColorAt(n, c.setScalar(k));
      });
      if (part.mesh.instanceColor) part.mesh.instanceColor.needsUpdate = true;
    }
  }

  /** Walls between the camera and ECHO drop low so ECHO is never hidden. Redone when the player changes tile. */
  private updateCutaway(): void {
    const px = Math.floor(this.world.player.x);
    const py = Math.floor(this.world.player.y);
    const key = `${px},${py}`;
    if (key === this.cutKey) return;
    this.cutKey = key;
    const g = this.world.grid;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    this.wallIds.forEach((i, n) => {
      const x = i % g.width;
      const y = Math.floor(i / g.width);
      const near = Math.abs(x - px) <= 3 && y >= py + 1 && y <= py + 5;
      const h = near ? WALL_LOW : (this.wallH[n] ?? WALL_H);
      m.compose(new THREE.Vector3(x + 0.5, h / 2, y + 0.5), q, new THREE.Vector3(1, h, 1));
      this.wallMesh.setMatrixAt(n, m);
    });
    this.wallMesh.instanceMatrix.needsUpdate = true;
    if (this.kit) {
      const lowered = new Set<number>();
      this.wallIds.forEach((i, n) => {
        const x = i % g.width;
        const y = Math.floor(i / g.width);
        if (Math.abs(x - px) <= 3 && y >= py + 1 && y <= py + 5) lowered.add(n);
      });
      this.placePanels((n) => (lowered.has(n) ? WALL_LOW : (this.wallH[n] ?? WALL_H)));
    }
  }

  private syncEntities(now: number): void {
    const w = this.world;
    const p = w.player;

    // ECHO.
    const ver = p.version.id;
    if (this.echoVersion !== ver) {
      this.scene.remove(this.echo);
      this.echo = this.makeEcho(ver === 'v1');
      this.echoVersion = ver;
      this.echoGhost = false;
      this.scene.add(this.echo);
    }
    this.echo.position.set(p.x, p.moving ? Math.sin(now / 70) * 0.03 : 0, p.y);
    this.echo.rotation.y = -p.facing;
    if (this.echoGhost !== p.inVent) {
      this.echoGhost = p.inVent;
      this.echo.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m) {
          m.transparent = p.inVent;
          m.opacity = p.inVent ? 0.5 : 1;
        }
      });
    }
    (this.echo.userData.flash as (on: boolean) => void)(p.hitFlash > 0);
    this.animateEcho(now);
    this.glow.position.set(p.x, 1.2, p.y);

    const ring = (mesh: THREE.Mesh, on: boolean) => {
      mesh.visible = on;
      if (on) mesh.position.set(p.x, 0.06, p.y);
    };
    ring(this.echoRings.sneak, p.sneaking);
    ring(this.echoRings.charge, p.charging);
    ring(this.echoRings.interact, !!p.interact);
    if (p.interact) this.setArc(this.echoRings.interact, 0.68, 0.78, p.interact.progress / p.interact.duration);

    // Guards.
    const seen = new Set<number>();
    for (const g of w.guards) {
      seen.add(g.id);
      let m = this.guards.get(g.id);
      if (!m) {
        m = this.makeGuard(g);
        this.guards.set(g.id, m);
        this.dyn.add(m);
      }
      const visible = this.tileSeen(g.x, g.y);
      m.visible = visible;
      const isDrone = g.kind === 'drone';
      if (isDrone && g.state === 'down') m.visible = false; // wreck vanishes in the kill burst
      m.position.set(g.x, isDrone ? 0.6 + Math.sin(now / 180 + g.id) * 0.08 : g.state === 'down' && !ud0(m) ? 0.2 : 0, g.y);
      const ud = m.userData as {
        body: THREE.Group;
        tint: (color: number, intensity: number) => void;
        anim: GuardAnim | null;
        sus: { group: THREE.Group; fill: THREE.Mesh };
        hp: { group: THREE.Group; fill: THREE.Mesh };
      };
      // Only the body turns; the status bars keep facing the camera.
      // Humans play a death animation; the procedural body just tips over.
      ud.body.rotation.set(0, -g.facing, g.state === 'down' && !ud.anim && !isDrone ? Math.PI / 2 : 0);
      const flash = g.hitFlash > 0;
      ud.tint(flash ? C.white : g.state === 'alert' ? C.red : g.state === 'stunned' ? C.blue : 0x000000, flash ? 1 : 0.5);
      if (ud.anim && m.visible) this.animateGuard(g, ud.anim);
      const showSus = g.suspicion > 0.02 && g.state !== 'alert' && g.state !== 'stunned' && g.state !== 'down';
      this.setBar(ud.sus, showSus, g.suspicion);
      this.setBar(ud.hp, g.hp < g.maxHp && g.state !== 'down', g.hp / g.maxHp);
      const [color, opacity] = GUARD_CONE[g.state];
      this.updateCone(`g${g.id}`, g.x, g.y, g.facing, CFG.guard.fov, CFG.guard.range, color, visible && !isDrone ? opacity : 0);
    }
    for (const [id, m] of this.guards) {
      if (!seen.has(id)) {
        this.dyn.remove(m);
        this.guards.delete(id);
      }
    }

    // Officer aiming telegraph.
    const aiming = w.guards.find((g) => g.aimTimer >= 0 && this.tileSeen(g.x, g.y));
    this.telegraph.visible = !!aiming;
    if (aiming) {
      const pos = this.telegraph.geometry.getAttribute('position') as THREE.BufferAttribute;
      pos.setXYZ(0, aiming.x, 0.6, aiming.y);
      pos.setXYZ(1, p.x, 0.4, p.y);
      pos.needsUpdate = true;
      (this.telegraph.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.5 * Math.abs(Math.sin(now / 40));
    }

    // Cameras: cone only, plus no model yet (the mount is a wall tile).
    for (const c of w.cameras) {
      const live = !(c.disabled || c.cooldown > 0 || c.emp > 0);
      const known = this.tileSeen(c.mountX, c.mountY, true);
      this.updateCone(`c${c.id}`, c.x, c.y, c.facing, CFG.camera.fov, CFG.camera.range, c.seesPlayer ? C.red : 0x8fd3ff, live && known ? (c.seesPlayer ? 0.24 : 0.12) : 0);
    }

    // Props and fabricator.
    for (const o of this.props) {
      o.visible = !!w.visible[o.userData.tile as number] || !!w.explored[o.userData.tile as number];
      const t = o.userData.terminal as { hacked: boolean } | undefined;
      if (t) {
        const screen = o.getObjectByName('screen');
        if (screen) screen.visible = !t.hacked;
        for (const sm of (o.userData.screens as THREE.MeshStandardMaterial[] | undefined) ?? []) sm.color.setScalar(t.hacked ? 0.08 : 1);
      }
      const s = o.userData.scrap as { taken: boolean } | undefined;
      if (s && s.taken) o.visible = false;
      const c = o.userData.cache as { opened: boolean } | undefined;
      if (c) {
        o.traverse((n) => {
          const mm = (n as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
          if (mm) {
            mm.emissiveIntensity = c.opened ? 0 : 0.4;
            if (this.kit) mm.color.setScalar(c.opened ? 0.35 : 1);
          }
        });
      }
      if (o.userData.fab) {
        const core = o.getObjectByName('core') as THREE.Mesh;
        const f = w.fabricator!;
        const color = f.state === 'locked' ? 0x555555 : f.state === 'rebooting' ? C.red : f.state === 'done' ? C.green : C.amber;
        (core.material as THREE.MeshStandardMaterial).emissive.set(color);
        core.rotation.y = now / (f.state === 'compiling' ? 250 : 600);
        core.position.y = 1.1 + Math.sin(now / 400) * 0.1;
      }
    }
    const fab = w.fabricator;
    this.fabRing.visible = !!fab && fab.state === 'compiling';
    if (fab && this.fabRing.visible) {
      this.fabRing.position.set(fab.x + 0.5, 0.06, fab.y + 0.5);
      this.setArc(this.fabRing, 1.0, 1.1, fab.progress / CFG.compile.duration);
    }

    // Module pickups bob in the air.
    const live = new Set<number>();
    for (const pk of w.modulePickups) {
      live.add(pk.id);
      let m = this.pickups.get(pk.id);
      if (!m) {
        m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), mat(C.white, C.blue, 1.2));
        m.castShadow = true;
        this.dyn.add(m);
        this.pickups.set(pk.id, m);
      }
      m.visible = this.tileSeen(pk.x, pk.y, true);
      m.position.set(pk.x, 0.55 + Math.sin(now / 200 + pk.id) * 0.06, pk.y);
      m.rotation.y = now / 500;
    }
    for (const [id, m] of this.pickups) {
      if (!live.has(id)) {
        this.dyn.remove(m);
        this.pickups.delete(id);
      }
    }

    // Projectiles.
    while (this.bullets.length < w.projectiles.length) {
      const b = new THREE.Mesh(this.bulletGeo, this.bulletMat);
      this.dyn.add(b);
      this.bullets.push(b);
    }
    this.bullets.forEach((b, i) => {
      const pr = w.projectiles[i];
      b.visible = !!pr;
      if (pr) b.position.set(pr.x, 0.55, pr.y);
    });

    // Exit door.
    const open = w.grid.exitOpen;
    for (const dm of this.exitMats) {
      dm.emissive.set(open ? C.green : 0x5a1414);
      dm.emissiveIntensity = open ? 0.8 + 0.4 * Math.sin(now / 200) : 0.6;
      if (!this.kit) dm.color.set(open ? C.green : 0x5a1414);
    }
  }

  /** Picks a clip from the guard's state and movement; crossfades when it changes. */
  private animateGuard(g: Guard, a: GuardAnim): void {
    const moved = Math.hypot(g.x - a.px, g.y - a.py);
    a.px = g.x;
    a.py = g.y;
    const moving = this.dt > 0 && moved / this.dt > 0.4;
    const officer = g.kind === 'officer';
    let want: string;
    if (g.kind === 'drone') want = g.state === 'stunned' ? 'Hit' : dist2(g, this.world.player) < 1.4 ? 'Attack' : 'Idle';
    else if (g.state === 'down') want = 'Death01';
    else if (g.state === 'stunned') want = 'Hit_Chest';
    else if (g.state === 'alert') want = moving ? 'Jog_Fwd_Loop' : officer ? 'Pistol_Idle_Loop' : 'Idle_Loop';
    else if (g.state === 'suspicious' || g.state === 'investigate') want = moving ? 'Walk_Loop' : 'Idle_Torch_Loop';
    else want = moving ? 'Walk_Loop' : 'Idle_Loop';
    const next = a.actions[want];
    if (next && want !== a.current) {
      next.reset();
      if (want === 'Death01' || want === 'Hit_Chest' || want === 'Hit') {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else next.setLoop(THREE.LoopRepeat, Infinity);
      next.play();
      if (a.current) a.actions[a.current]?.crossFadeTo(next, 0.2, false);
      a.current = want;
    }
    a.mixer.update(this.dt);
  }

  /** Drives the QuadShell animations from sim state: idle, walk (slower when sneaking), a one-shot attack. */
  private animateEcho(now: number): void {
    const a = this.echoAnim;
    const p = this.world.player;
    const brush = this.echo.userData.brush as THREE.Group | undefined;
    if (brush) brush.children.forEach((b, i) => (b.rotation.y = (now / 140) * (p.moving ? 3 : 1) * (i ? 1 : -1)));
    if (!a) return;
    a.mixer.update(this.dt);
    const attacked = p.attackCooldown > this.lastAttackCd + 1e-6;
    this.lastAttackCd = p.attackCooldown;
    if (attacked && a.actions.Attack) {
      const atk = a.actions.Attack;
      atk.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1);
      atk.clampWhenFinished = true;
      atk.play();
      a.actions[a.current]?.crossFadeTo(atk, 0.08, false);
      a.current = 'Attack';
      a.attackUntil = now + 450;
    }
    if (now < a.attackUntil) return;
    const want = p.moving ? 'Walk' : 'Idle';
    if (want !== a.current && a.actions[want]) {
      const next = a.actions[want];
      next.reset().play();
      a.actions[a.current]?.crossFadeTo(next, 0.15, false);
      a.current = want;
    }
    if (a.actions.Walk) a.actions.Walk.timeScale = p.sneaking ? 0.5 : 1;
  }

  private setBar(b: { group: THREE.Group; fill: THREE.Mesh }, on: boolean, k: number): void {
    b.group.visible = on;
    if (!on) return;
    const f = Math.max(0.001, Math.min(1, k));
    b.fill.scale.x = f;
    b.fill.position.x = -0.35 * (1 - f);
  }

  /** Redraws a partial ring as a progress arc. */
  private setArc(mesh: THREE.Mesh, inner: number, outer: number, k: number): void {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.RingGeometry(inner, outer, 40, 1, 0, Math.max(0.01, Math.min(1, k)) * Math.PI * 2);
  }

  private updateFx(dt: number): void {
    for (const f of this.fx) {
      f.t += dt;
      f.update(Math.min(1, f.t / f.life));
    }
    this.fx = this.fx.filter((f) => {
      if (f.t < f.life) return true;
      this.dyn.remove(f.obj);
      f.obj.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        (m.material as THREE.Material | undefined)?.dispose();
      });
      return false;
    });
  }

  private updateCamera(dt: number): void {
    const p = this.world.player;
    // Lead the camera a little toward where ECHO faces, so you see what's coming.
    const lead = p.moving ? 1.1 : 0.6;
    const goal = new THREE.Vector3(p.x + Math.cos(p.facing) * lead, 0, p.y + Math.sin(p.facing) * lead);
    this.camTarget.lerp(goal, 1 - Math.pow(0.0005, dt));
    const c = this.camera;
    c.position.set(this.camTarget.x, Math.sin(CAM_PITCH) * CAM_DIST, this.camTarget.z + Math.cos(CAM_PITCH) * CAM_DIST);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      c.position.x += (Math.random() - 0.5) * this.shake * 0.9;
      c.position.y += (Math.random() - 0.5) * this.shake * 0.9;
    }
    c.lookAt(this.camTarget);
    this.sun.position.set(this.camTarget.x + 6, 14, this.camTarget.z + 4);
    this.sun.target.position.copy(this.camTarget);
  }
}
