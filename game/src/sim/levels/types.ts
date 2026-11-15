import type { EnemyKind } from '../enemies';
import type { Grid, Vec } from '../grid';

export type TerminalKind = 'data' | 'security';

export interface TerminalDef {
  x: number;
  y: number;
  kind: TerminalKind;
}

export interface CameraDef {
  /** Wall tile the camera is mounted on. */
  x: number;
  y: number;
  /** Direction the camera faces (radians); the eye sits on the wall face in that direction. */
  facing: number;
  sweep: number;
  speed: number;
}

export interface GuardDef {
  route: Vec[];
  /** Initial facing for sentries (single-waypoint routes). */
  facing?: number;
  kind?: EnemyKind;
}

export interface FabricatorDef {
  x: number;
  y: number;
  /** Where siege reinforcements enter during a Compile. */
  spawnPoints: Vec[];
}

export interface LevelData {
  id: 'lab' | 'undercity';
  name: string;
  act: number;
  /** Prefix for enemy call signs (SEC-01, PD-02…). */
  callSign: string;
  grid: Grid;
  playerStart: Vec;
  exit: Vec;
  /** What hacking the security terminal does in this sector. */
  securityUnlocks: 'fabricator' | 'exit';
  terminals: TerminalDef[];
  scrapPiles: Vec[];
  outlets: Vec[];
  cameras: CameraDef[];
  guards: GuardDef[];
  fabricator: FabricatorDef | null;
  /** Sealed caches (hold F) that always contain a module. */
  caches: Vec[];
  /** Where modules are installed cheaply and offers can be rerolled. */
  workbench: Vec | null;
  intro: string[];
}

export const DOWN = Math.PI / 2;
export const UP = -Math.PI / 2;
export const LEFT = Math.PI;
