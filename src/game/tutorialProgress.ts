const STORAGE_KEY = 'beatgarden.rhythmTutorials.v1';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return typeof window.localStorage?.getItem === 'function' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function hasCompletedTutorial(stageId: string): boolean {
  try {
    const parsed = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) && parsed.includes(stageId);
  } catch {
    return false;
  }
}

export function markTutorialCompleted(stageId: string): void {
  const localStore = storage();
  if (!localStore) return;
  let completed: string[] = [];
  try {
    const parsed = JSON.parse(localStore.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (Array.isArray(parsed)) completed = parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    // Replace only this dedicated progress record if it is malformed.
  }
  if (!completed.includes(stageId)) completed.push(stageId);
  localStore.setItem(STORAGE_KEY, JSON.stringify(completed));
}

export function resetTutorialProgress(): void {
  storage()?.removeItem(STORAGE_KEY);
}
