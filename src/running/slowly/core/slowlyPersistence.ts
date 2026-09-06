export type { ReflectionRecordV1 } from '../../core/slowlySchema';

export const SLOWLY_PRIVATE_STORAGE_KEY = 'beatgarden.running.slowly.private.v1';
export const MAX_PRIVATE_RECORDS = 50;
export const MAX_PRIVATE_BYTES = 256 * 1024;
export const MAX_PRIVATE_CODE_POINTS = 4000;

export interface SlowlyPrivateRecordV1 {
  version: 1;
  id: string;
  situation: string;
  mirror: string;
  bridge: string;
  companionPrompt: string;
  updatedAt: number;
}


type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readPrivateRecord(id: string, storage: StorageLike | null = browserStorage()): SlowlyPrivateRecordV1 | null {
  return loadPrivateRecords(storage).find((record) => record.id === id) ?? null;
}

export function writePrivateRecord(record: SlowlyPrivateRecordV1, storage: StorageLike | null = browserStorage()): void {
  if (!storage || !isPrivateRecord(record)) throw new Error('Invalid Slowly Island private record.');
  const previous = storage.getItem(SLOWLY_PRIVATE_STORAGE_KEY);
  const records = loadPrivateRecords(storage).filter((item) => item.id !== record.id);
  records.push(structuredClone(record));
  const serialized = JSON.stringify({ version: 1, records: records.slice(-MAX_PRIVATE_RECORDS) });
  if (new TextEncoder().encode(serialized).byteLength > MAX_PRIVATE_BYTES) throw new Error('Slowly Island private storage exceeds 256 KiB.');
  try {
    storage.setItem(SLOWLY_PRIVATE_STORAGE_KEY, serialized);
    if (JSON.stringify(readPrivateRecord(record.id, storage)) !== JSON.stringify(record)) throw new Error('Private record verification failed.');
  } catch (error) {
    restore(storage, previous);
    throw error;
  }
}

export function deletePrivateRecord(id: string, storage: StorageLike | null = browserStorage()): void {
  if (!storage || !safeId(id)) return;
  const previous = storage.getItem(SLOWLY_PRIVATE_STORAGE_KEY);
  const records = loadPrivateRecords(storage).filter((item) => item.id !== id);
  try {
    if (records.length) storage.setItem(SLOWLY_PRIVATE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
    else storage.removeItem(SLOWLY_PRIVATE_STORAGE_KEY);
    if (readPrivateRecord(id, storage) !== null) throw new Error('Private record deletion verification failed.');
  } catch (error) {
    restore(storage, previous);
    throw error;
  }
}

export function cleanupOrphanPrivateRecords(linkedIds: ReadonlySet<string>, storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  const previous = storage.getItem(SLOWLY_PRIVATE_STORAGE_KEY);
  const records = loadPrivateRecords(storage).filter((item) => linkedIds.has(item.id));
  try {
    if (records.length) storage.setItem(SLOWLY_PRIVATE_STORAGE_KEY, JSON.stringify({ version: 1, records }));
    else storage.removeItem(SLOWLY_PRIVATE_STORAGE_KEY);
    const remaining = loadPrivateRecords(storage);
    if (remaining.some((item) => !linkedIds.has(item.id))) throw new Error('Private record cleanup verification failed.');
  } catch (error) {
    restore(storage, previous);
    throw error;
  }
}

export function loadPrivateRecords(storage: Pick<Storage, 'getItem'> | null = browserStorage()): SlowlyPrivateRecordV1[] {
  if (!storage) return [];
  const raw = storage.getItem(SLOWLY_PRIVATE_STORAGE_KEY);
  if (raw !== null && new TextEncoder().encode(raw).byteLength > MAX_PRIVATE_BYTES) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw ?? 'null'); } catch { return []; }
  if (!record(parsed) || parsed.version !== 1 || !exactKeys(parsed, ['version', 'records']) || !Array.isArray(parsed.records) || parsed.records.length > MAX_PRIVATE_RECORDS) return [];
  return parsed.records.filter(isPrivateRecord);
}

export function boundedPrivateText(value: string): string {
  return [...value.replace(/[\u0000-\u001f\u007f]/g, '')].slice(0, MAX_PRIVATE_CODE_POINTS).join('');
}


function isPrivateRecord(value: unknown): value is SlowlyPrivateRecordV1 {
  if (!record(value) || !exactKeys(value, ['version', 'id', 'situation', 'mirror', 'bridge', 'companionPrompt', 'updatedAt']) || value.version !== 1 || !safeId(value.id)) return false;
  return ['situation', 'mirror', 'bridge', 'companionPrompt'].every((key) => typeof value[key] === 'string' && boundedPrivateText(value[key]) === value[key] && [...value[key]].length <= MAX_PRIVATE_CODE_POINTS)
    && typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) && value.updatedAt >= 0;
}
function safeId(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(value); }
function exactKeys(value: Record<string, unknown>, keys: string[]): boolean { return Object.keys(value).sort().join('|') === [...keys].sort().join('|'); }
function record(value: unknown): value is Record<string, any> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function restore(storage: StorageLike, previous: string | null): void { try { if (previous === null) storage.removeItem(SLOWLY_PRIVATE_STORAGE_KEY); else storage.setItem(SLOWLY_PRIVATE_STORAGE_KEY, previous); } catch { /* original failure remains authoritative */ } }
function browserStorage(): StorageLike | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
