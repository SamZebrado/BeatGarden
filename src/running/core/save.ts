export const RUNNING_STORAGE_KEY = 'beatgarden.running.v1';

export interface RunningSaveV1 {
  version: 1;
  lastWorld: 'phd' | 'master' | 'work' | null;
  totalRuns: number;
}

export const DEFAULT_RUNNING_SAVE: Readonly<RunningSaveV1> = {
  version: 1,
  lastWorld: null,
  totalRuns: 0,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadRunningSave(storage: StorageLike | null = browserStorage()): RunningSaveV1 {
  if (!storage) return { ...DEFAULT_RUNNING_SAVE };
  try {
    const value = JSON.parse(storage.getItem(RUNNING_STORAGE_KEY) ?? 'null') as Partial<RunningSaveV1> | null;
    if (!value || value.version !== 1) return { ...DEFAULT_RUNNING_SAVE };
    return {
      version: 1,
      lastWorld: value.lastWorld === 'phd' || value.lastWorld === 'master' || value.lastWorld === 'work' ? value.lastWorld : null,
      totalRuns: Number.isSafeInteger(value.totalRuns) && value.totalRuns! >= 0 ? value.totalRuns! : 0,
    };
  } catch {
    return { ...DEFAULT_RUNNING_SAVE };
  }
}

export function saveRunningData(value: RunningSaveV1, storage: StorageLike | null = browserStorage()): void {
  storage?.setItem(RUNNING_STORAGE_KEY, JSON.stringify(value));
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}
