import { buildLab } from './lab';
import type { LevelData } from './types';
import { buildUndercity } from './undercity';

export type LevelId = LevelData['id'];

/** Sectors in run order. M2.3 replaces this fixed list with a generated route map. */
export const LEVEL_ORDER: LevelId[] = ['lab', 'undercity'];

export function buildLevel(id: LevelId): LevelData {
  return id === 'lab' ? buildLab() : buildUndercity();
}

export type { LevelData } from './types';
