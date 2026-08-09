export type BestScore = { score: number; accuracy: number; total: number };

type ScoreStorage = Pick<Storage, 'getItem' | 'setItem'>;
const PREFIX = 'beatgarden.best.';

function browserStorage(): ScoreStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  try { return window.localStorage; } catch { return undefined; }
}

export function loadBestScore(stageId: string, storage: ScoreStorage | undefined = browserStorage()): BestScore | null {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(PREFIX + stageId) ?? 'null') as Partial<BestScore> | null;
    if (!parsed || !Number.isFinite(parsed.score) || !Number.isFinite(parsed.accuracy) || !Number.isFinite(parsed.total)) return null;
    return { score: parsed.score!, accuracy: parsed.accuracy!, total: parsed.total! };
  } catch { return null; }
}

export function saveBestScore(stageId: string, next: BestScore, storage: ScoreStorage | undefined = browserStorage()): BestScore {
  const current = loadBestScore(stageId, storage);
  const best = !current || next.score > current.score || (next.score === current.score && next.accuracy > current.accuracy)
    ? next : current;
  if (storage) storage.setItem(PREFIX + stageId, JSON.stringify(best));
  return best;
}
