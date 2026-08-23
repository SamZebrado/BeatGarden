import type { RunningDifficulty } from './difficulty';
import { parseBossConfig } from './bossSchema';
import type { RunningWorld } from './types';
import { parsePersonCore, type PersonCoreV1 } from './personScience';
export type { RunningWorld } from './types';

export const RUNNING_STORAGE_KEY_V1 = 'beatgarden.running.v1';
export const RUNNING_STORAGE_KEY = 'beatgarden.running.v2';
export interface RunningSaveV1 { version: 1; lastWorld: RunningWorld | null; totalRuns: number }
export interface StoredBossMetadata {
  id: string;
  displayName: string;
  origin: 'builtin' | 'custom' | 'promoted-player';
  worlds: RunningWorld[];
  updatedAt: string;
  data: unknown;
}
export interface RunningSaveV2 {
  version: 2;
  lastWorld: RunningWorld | null;
  totalRuns: number;
  worldCompletions: Partial<Record<RunningWorld, number>>;
  milestoneCompletions: string[];
  unlockedContent: string[];
  difficultyRecords: Partial<Record<RunningWorld, RunningDifficulty>>;
  seenHints: string[];
  customBosses: StoredBossMetadata[];
  customPeople: PersonCoreV1[];
  audioMuted: boolean;
}

export const DEFAULT_RUNNING_SAVE: Readonly<RunningSaveV2> = {
  version: 2, lastWorld: null, totalRuns: 0, worldCompletions: {}, milestoneCompletions: [],
  unlockedContent: [], difficultyRecords: {}, seenHints: [], customBosses: [], customPeople: [], audioMuted: false,
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadRunningSave(storage: StorageLike | null = browserStorage()): RunningSaveV2 {
  if (!storage) return freshDefault();
  const current = parseStored<Partial<RunningSaveV2>>(storage.getItem(RUNNING_STORAGE_KEY));
  if (current?.version === 2) return sanitizeV2(current);
  const legacy = parseStored<Partial<RunningSaveV1>>(storage.getItem(RUNNING_STORAGE_KEY_V1));
  if (legacy?.version === 1) {
    const migrated = sanitizeV2({ ...DEFAULT_RUNNING_SAVE, lastWorld: validWorld(legacy.lastWorld) ? legacy.lastWorld : null, totalRuns: validCount(legacy.totalRuns) });
    storage.setItem(RUNNING_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  }
  return freshDefault();
}

export function saveRunningData(value: RunningSaveV2, storage: StorageLike | null = browserStorage()): void {
  storage?.setItem(RUNNING_STORAGE_KEY, JSON.stringify(sanitizeV2(value)));
}

export function updateRunningSave(patch: Partial<Omit<RunningSaveV2, 'version'>>, storage: StorageLike | null = browserStorage()): RunningSaveV2 {
  const next = sanitizeV2({ ...loadRunningSave(storage), ...patch, version: 2 });
  saveRunningData(next, storage);
  return next;
}

export function markHintSeen(id: string, storage: StorageLike | null = browserStorage()): void {
  const save = loadRunningSave(storage);
  if (!safeId(id) || save.seenHints.includes(id)) return;
  saveRunningData({ ...save, seenHints: [...save.seenHints, id] }, storage);
}

export function markWorldCompleted(world: RunningWorld, difficulty: RunningDifficulty, storage: StorageLike | null = browserStorage()): void {
  const save = loadRunningSave(storage);
  saveRunningData({ ...save, worldCompletions: { ...save.worldCompletions, [world]: (save.worldCompletions[world] ?? 0) + 1 },
    difficultyRecords: { ...save.difficultyRecords, [world]: difficulty }, unlockedContent: unique([...save.unlockedContent, `${world}:complete`, 'boss-studio']) }, storage);
}

function sanitizeV2(value: Partial<RunningSaveV2>): RunningSaveV2 {
  const worlds = ['phd', 'master', 'work'] as const;
  const difficulties = ['sprout', 'garden', 'storm'] as const;
  const worldCompletions: RunningSaveV2['worldCompletions'] = {};
  const difficultyRecords: RunningSaveV2['difficultyRecords'] = {};
  for (const world of worlds) {
    const count = value.worldCompletions?.[world];
    if (Number.isSafeInteger(count) && count! >= 0) worldCompletions[world] = count!;
    const difficulty = value.difficultyRecords?.[world];
    if (difficulties.includes(difficulty as RunningDifficulty)) difficultyRecords[world] = difficulty!;
  }
  return { version: 2, lastWorld: validWorld(value.lastWorld) ? value.lastWorld : null, totalRuns: validCount(value.totalRuns), worldCompletions,
    milestoneCompletions: cleanIds(value.milestoneCompletions), unlockedContent: cleanIds(value.unlockedContent), difficultyRecords,
    seenHints: cleanIds(value.seenHints), customBosses: Array.isArray(value.customBosses) ? value.customBosses.map(sanitizeBossMetadata).filter((boss): boss is StoredBossMetadata => boss !== null).slice(0, 50) : [],
    customPeople: Array.isArray(value.customPeople) ? value.customPeople.map(sanitizePerson).filter((person): person is PersonCoreV1 => person !== null).slice(0, 50) : [], audioMuted: value.audioMuted === true };
}

export function parseRunningSaveV2(value: unknown): { ok: true; value: RunningSaveV2 } | { ok: false; errors: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['meta: expected object.'] };
  const record = value as Record<string, unknown>;
  const allowed = ['version', 'lastWorld', 'totalRuns', 'worldCompletions', 'milestoneCompletions', 'unlockedContent', 'difficultyRecords', 'seenHints', 'customBosses', 'customPeople', 'audioMuted'];
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length) return { ok: false, errors: unknown.map((key) => `meta.${key}: unknown field.`) };
  if (record.version !== 2) return { ok: false, errors: ['meta.version: expected 2.'] };
  // customPeople is an additive v2 field. Accept pre-Person-System v2 saves and
  // migrate them in memory while keeping every supplied field strictly checked.
  const candidate = record.customPeople === undefined ? { ...record, customPeople: [] } : record;
  const normalized = sanitizeV2(candidate as Partial<RunningSaveV2>);
  if (canonical(candidate) !== canonical(normalized)) return { ok: false, errors: ['meta: invalid or out-of-range Running data.'] };
  return { ok: true, value: normalized };
}

function sanitizeBossMetadata(value: unknown): StoredBossMetadata | null {
  if (!value || typeof value !== 'object') return null;
  const boss = value as Partial<StoredBossMetadata>;
  if (typeof boss.updatedAt !== 'string') return null;
  let serialized: string;
  try { serialized = JSON.stringify(boss.data); } catch { return null; }
  const parsed = parseBossConfig(serialized);
  if (!parsed.ok || !parsed.value) return null;
  return { id: parsed.value.id, displayName: parsed.value.name.en, origin: parsed.value.origin, worlds: [...parsed.value.worlds], updatedAt: boss.updatedAt, data: parsed.value };
}
function sanitizePerson(value: unknown): PersonCoreV1 | null { const parsed = parsePersonCore(value); return parsed.ok ? parsed.value : null; }
function validWorld(value: unknown): value is RunningWorld { return value === 'phd' || value === 'master' || value === 'work'; }
function validCount(value: unknown): number { return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0; }
function safeId(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(value); }
function cleanIds(value: unknown): string[] { return Array.isArray(value) ? unique(value.filter(safeId)).slice(0, 300) : []; }
function unique(values: string[]): string[] { return [...new Set(values)]; }
function parseStored<T>(value: string | null): T | null { try { return JSON.parse(value ?? 'null') as T | null; } catch { return null; } }
function freshDefault(): RunningSaveV2 { return { ...DEFAULT_RUNNING_SAVE, worldCompletions: {}, milestoneCompletions: [], unlockedContent: [], difficultyRecords: {}, seenHints: [], customBosses: [], customPeople: [] }; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
function browserStorage(): StorageLike | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
