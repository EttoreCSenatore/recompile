/**
 * Loader for the Quaternius Modular SciFi MegaKit pieces in `public/models/megakit/` (CC0, see LICENSE.txt there).
 * The kit's units are 4 per tile-sized module, so callers scale pieces to the game's 1-unit tiles.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** One mesh of a piece, with the transform it has inside the piece. */
export interface Part {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrix: THREE.Matrix4;
}

export const PIECES = [
  'Platform_Simple',
  'Door_Metal',
  'WallBand_Straight',
  'WallAstra_Straight',
  'Prop_Computer',
  'Prop_Chest',
  'Prop_Crate3',
  'Prop_ItemHolder',
  'Prop_Vent_Small',
] as const;
export type PieceName = (typeof PIECES)[number];

export class Kit {
  private readonly parts = new Map<PieceName, Part[]>();

  /** Loads every piece; throws if any fails (the renderer then falls back to procedural models). */
  static async load(base = `${import.meta.env.BASE_URL}models/megakit/`): Promise<Kit> {
    const kit = new Kit();
    const loader = new GLTFLoader();
    await Promise.all(
      PIECES.map(async (name) => {
        const gltf = await loader.loadAsync(`${base}${name}.gltf`);
        gltf.scene.updateMatrixWorld(true);
        const parts: Part[] = [];
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) parts.push({ geometry: m.geometry, material: m.material as THREE.Material, matrix: m.matrixWorld.clone() });
        });
        kit.parts.set(name, parts);
      }),
    );
    return kit;
  }

  get(name: PieceName): Part[] {
    return this.parts.get(name) ?? [];
  }

  /** A single placed copy: geometry is shared, materials are cloned so the caller can tint them. */
  clone(name: PieceName): THREE.Group {
    const g = new THREE.Group();
    for (const p of this.get(name)) {
      const mesh = new THREE.Mesh(p.geometry, p.material.clone());
      mesh.applyMatrix4(p.matrix);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  }

  /** Instanced copies: one InstancedMesh per part, matrices are `placement × part transform`. */
  instance(name: PieceName, placements: THREE.Matrix4[]): THREE.InstancedMesh[] {
    return this.get(name).map((p) => {
      const mesh = new THREE.InstancedMesh(p.geometry, p.material, placements.length);
      const m = new THREE.Matrix4();
      placements.forEach((pl, i) => mesh.setMatrixAt(i, m.multiplyMatrices(pl, p.matrix)));
      mesh.setColorAt(0, new THREE.Color(1, 1, 1)); // allocates instanceColor for the fog pass
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    });
  }

  /** Height of a piece (max y of its parts), used to fit pieces to game-sized heights. */
  height(name: PieceName): number {
    let h = 0;
    const v = new THREE.Vector3();
    for (const p of this.get(name)) {
      p.geometry.computeBoundingBox();
      const bb = p.geometry.boundingBox!;
      for (const y of [bb.min.y, bb.max.y]) h = Math.max(h, v.set(0, y, 0).applyMatrix4(p.matrix).y);
    }
    return h;
  }
}
