export type RunningDifficulty = 'sprout' | 'garden' | 'storm';

export interface DifficultyProfile {
  enemySpeed: number;
  enemyDamage: number;
  spawnInterval: number;
  telegraphDuration: number;
}

export const DIFFICULTY: Record<RunningDifficulty, DifficultyProfile> = {
  sprout: { enemySpeed: 0.78, enemyDamage: 0.65, spawnInterval: 1.2, telegraphDuration: 1.35 },
  garden: { enemySpeed: 1, enemyDamage: 1, spawnInterval: 1, telegraphDuration: 1 },
  storm: { enemySpeed: 1.18, enemyDamage: 1.25, spawnInterval: 0.82, telegraphDuration: 0.8 },
};

export function parseDifficulty(value: string | null): RunningDifficulty {
  return value === 'sprout' || value === 'storm' ? value : 'garden';
}
