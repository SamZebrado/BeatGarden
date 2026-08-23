import type { RunningDifficulty } from './difficulty';
import { parseBossConfig } from './bossSchema';
import type { RunningWorld } from './types';
import { parsePersonCore, type PersonCoreV1 } from './personScience';
import { DEFAULT_AGGREGATE_STATS, journeyRecord, sanitizeAchievementIds, sanitizeAggregateStats, sanitizeJourneyHistory, sanitizeStoryMarkIds, type AchievementId, type DynamicIntensity, type JourneyCompletionInput, type JourneyRecordV1, type MusicStyle, type RestActivityId, type RunningAggregateStats, type StoryMarkId } from './journal';
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
  journeyHistory: JourneyRecordV1[];
  achievements: AchievementId[];
  storyMarks: StoryMarkId[];
  aggregateStats: RunningAggregateStats;
  musicStyle: MusicStyle;
  runningMusicVolume: number;
  runningSfxVolume: number;
  dynamicIntensity: DynamicIntensity;
}

export const DEFAULT_RUNNING_SAVE: Readonly<RunningSaveV2> = {
  version: 2, lastWorld: null, totalRuns: 0, worldCompletions: {}, milestoneCompletions: [],
  unlockedContent: [], difficultyRecords: {}, seenHints: [], customBosses: [], customPeople: [], audioMuted: false,
  journeyHistory: [], achievements: [], storyMarks: [], aggregateStats: { ...DEFAULT_AGGREGATE_STATS, failedRuns: {}, completedByStyle: {}, restActivities: [] },
  musicStyle: 'classic', runningMusicVolume: .8, runningSfxVolume: .9, dynamicIntensity: 'full',
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

export interface JourneyCompletionResult { record: JourneyRecordV1; unlocked: AchievementId[]; duplicate: boolean; save: RunningSaveV2 }

/** One durable completion transaction. A stable sourceRunId makes repeated terminal renders idempotent. */
export function recordSuccessfulJourney(input: JourneyCompletionInput, storage: StorageLike | null = browserStorage()): JourneyCompletionResult {
  const current = loadRunningSave(storage);
  const existing = current.journeyHistory.find((record) => record.recordId === input.sourceRunId.toLowerCase().replace(/[^a-z0-9._:-]/g, '-').slice(0, 80));
  if (existing) return { record: existing, unlocked: [], duplicate: true, save: current };
  const completedWorlds = (Object.entries(current.worldCompletions) as Array<[RunningWorld, number]>).filter(([, count]) => count > 0).map(([world]) => world);
  const created = journeyRecord(input, current.achievements, current.aggregateStats, completedWorlds);
  const stats: RunningAggregateStats = {
    ...current.aggregateStats,
    failedRuns: { ...current.aggregateStats.failedRuns },
    completedByStyle: { ...current.aggregateStats.completedByStyle, [input.musicStyle]: (current.aggregateStats.completedByStyle[input.musicStyle] ?? 0) + 1 },
    restActivities: [...current.aggregateStats.restActivities],
    recoveryTaken: current.aggregateStats.recoveryTaken + Number(input.achievementSignals?.includes('recovery-choice') ?? false),
  };
  const storyMarks = unique([...current.storyMarks, ...created.record.storyMarks]) as StoryMarkId[];
  const extra: AchievementId[] = [];
  if (storyMarks.length >= 5 && !current.achievements.includes('story-collector') && !created.unlocked.includes('story-collector')) extra.push('story-collector');
  const achievements = unique([...current.achievements, ...created.unlocked, ...extra]) as AchievementId[];
  created.record.medalsUnlocked = [...created.unlocked, ...extra];
  const save = sanitizeV2({ ...current,
    worldCompletions: { ...current.worldCompletions, [input.world]: (current.worldCompletions[input.world] ?? 0) + 1 },
    difficultyRecords: { ...current.difficultyRecords, [input.world]: input.difficulty },
    unlockedContent: unique([...current.unlockedContent, `${input.world}:complete`, 'boss-studio']),
    journeyHistory: [...current.journeyHistory, created.record], achievements, storyMarks, aggregateStats: stats,
  });
  saveRunningData(save, storage);
  if (storage && JSON.stringify(loadRunningSave(storage)) !== JSON.stringify(save)) throw new Error('Running journey persistence verification failed.');
  return { record: created.record, unlocked: created.record.medalsUnlocked, duplicate: false, save };
}

export function recordFailedJourney(world: RunningWorld, storage: StorageLike | null = browserStorage()): void {
  const save = loadRunningSave(storage);
  updateRunningSave({ aggregateStats: { ...save.aggregateStats, failedRuns: { ...save.aggregateStats.failedRuns, [world]: (save.aggregateStats.failedRuns[world] ?? 0) + 1 }, completedByStyle: { ...save.aggregateStats.completedByStyle }, restActivities: [...save.aggregateStats.restActivities] } }, storage);
}

export function recordRestActivity(activity: RestActivityId, storage: StorageLike | null = browserStorage()): RunningSaveV2 {
  const save = loadRunningSave(storage);
  const activities = unique([...save.aggregateStats.restActivities, activity]) as RestActivityId[];
  const newlyUnlocked: AchievementId[] = activities.length === 3 && !save.achievements.includes('rest-corner-visitor') ? ['rest-corner-visitor'] : [];
  return updateRunningSave({ aggregateStats: { ...save.aggregateStats, failedRuns: { ...save.aggregateStats.failedRuns }, completedByStyle: { ...save.aggregateStats.completedByStyle }, restSessions: save.aggregateStats.restSessions + 1, restActivities: activities }, storyMarks: unique([...save.storyMarks, 'gentle-pause']) as StoryMarkId[], achievements: unique([...save.achievements, ...newlyUnlocked]) as AchievementId[] }, storage);
}

export function recordPortabilityEvent(kind: 'export' | 'import', storage: StorageLike | null = browserStorage()): RunningSaveV2 {
  const save = loadRunningSave(storage);
  const stats = { ...save.aggregateStats, failedRuns: { ...save.aggregateStats.failedRuns }, completedByStyle: { ...save.aggregateStats.completedByStyle }, restActivities: [...save.aggregateStats.restActivities], exports: save.aggregateStats.exports + Number(kind === 'export'), imports: save.aggregateStats.imports + Number(kind === 'import') };
  const unlock = stats.exports > 0 && stats.imports > 0 && !save.achievements.includes('portable-garden') ? ['portable-garden' as const] : [];
  return updateRunningSave({ aggregateStats: stats, achievements: unique([...save.achievements, ...unlock]) as AchievementId[] }, storage);
}

export function attachPromotedBossToJourney(recordId: string | null, bossId: string, storage: StorageLike | null = browserStorage()): RunningSaveV2 {
  const save = loadRunningSave(storage);
  const history = save.journeyHistory.map((record) => record.recordId === recordId ? { ...record, promotedBossId: bossId } : record);
  const unlocks: AchievementId[] = ['first-promoted-boss', 'boss-seed'];
  return updateRunningSave({ journeyHistory: history, achievements: unique([...save.achievements, ...unlocks]) as AchievementId[] }, storage);
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
  const aggregateStats = sanitizeAggregateStats(value.aggregateStats);
  return { version: 2, lastWorld: validWorld(value.lastWorld) ? value.lastWorld : null, totalRuns: validCount(value.totalRuns), worldCompletions,
    milestoneCompletions: cleanIds(value.milestoneCompletions), unlockedContent: cleanIds(value.unlockedContent), difficultyRecords,
    seenHints: cleanIds(value.seenHints), customBosses: Array.isArray(value.customBosses) ? value.customBosses.map(sanitizeBossMetadata).filter((boss): boss is StoredBossMetadata => boss !== null).slice(0, 50) : [],
    customPeople: Array.isArray(value.customPeople) ? value.customPeople.map(sanitizePerson).filter((person): person is PersonCoreV1 => person !== null).slice(0, 50) : [], audioMuted: value.audioMuted === true,
    journeyHistory: sanitizeJourneyHistory(value.journeyHistory), achievements: sanitizeAchievementIds(value.achievements), storyMarks: sanitizeStoryMarkIds(value.storyMarks), aggregateStats,
    musicStyle: validMusicStyle(value.musicStyle) ? value.musicStyle : 'classic', runningMusicVolume: validUnit(value.runningMusicVolume) ? value.runningMusicVolume : .8,
    runningSfxVolume: validUnit(value.runningSfxVolume) ? value.runningSfxVolume : .9, dynamicIntensity: validIntensity(value.dynamicIntensity) ? value.dynamicIntensity : 'full' };
}

export function parseRunningSaveV2(value: unknown): { ok: true; value: RunningSaveV2 } | { ok: false; errors: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, errors: ['meta: expected object.'] };
  const record = value as Record<string, unknown>;
  const allowed = ['version', 'lastWorld', 'totalRuns', 'worldCompletions', 'milestoneCompletions', 'unlockedContent', 'difficultyRecords', 'seenHints', 'customBosses', 'customPeople', 'audioMuted', 'journeyHistory', 'achievements', 'storyMarks', 'aggregateStats', 'musicStyle', 'runningMusicVolume', 'runningSfxVolume', 'dynamicIntensity'];
  const unknown = Object.keys(record).filter((key) => !allowed.includes(key));
  if (unknown.length) return { ok: false, errors: unknown.map((key) => `meta.${key}: unknown field.`) };
  if (record.version !== 2) return { ok: false, errors: ['meta.version: expected 2.'] };
  // customPeople is an additive v2 field. Accept pre-Person-System v2 saves and
  // migrate them in memory while keeping every supplied field strictly checked.
  const candidate = { ...record,
    ...(record.customPeople === undefined ? { customPeople: [] } : {}),
    ...(record.journeyHistory === undefined ? { journeyHistory: [] } : {}),
    ...(record.achievements === undefined ? { achievements: [] } : {}),
    ...(record.storyMarks === undefined ? { storyMarks: [] } : {}),
    ...(record.aggregateStats === undefined ? { aggregateStats: { ...DEFAULT_AGGREGATE_STATS, failedRuns: {}, completedByStyle: {}, restActivities: [] } } : {}),
    ...(record.musicStyle === undefined ? { musicStyle: 'classic' } : {}),
    ...(record.runningMusicVolume === undefined ? { runningMusicVolume: .8 } : {}),
    ...(record.runningSfxVolume === undefined ? { runningSfxVolume: .9 } : {}),
    ...(record.dynamicIntensity === undefined ? { dynamicIntensity: 'full' } : {}),
  };
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
function validMusicStyle(value: unknown): value is MusicStyle { return value === 'classic' || value === 'chiptune' || value === 'organic'; }
function validIntensity(value: unknown): value is DynamicIntensity { return value === 'full' || value === 'soft' || value === 'off'; }
function validUnit(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1; }
function validCount(value: unknown): number { return Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : 0; }
function safeId(value: unknown): value is string { return typeof value === 'string' && /^[a-z0-9][a-z0-9._:-]{0,79}$/i.test(value); }
function cleanIds(value: unknown): string[] { return Array.isArray(value) ? unique(value.filter(safeId)).slice(0, 300) : []; }
function unique(values: string[]): string[] { return [...new Set(values)]; }
function parseStored<T>(value: string | null): T | null { try { return JSON.parse(value ?? 'null') as T | null; } catch { return null; } }
function freshDefault(): RunningSaveV2 { return { ...DEFAULT_RUNNING_SAVE, worldCompletions: {}, milestoneCompletions: [], unlockedContent: [], difficultyRecords: {}, seenHints: [], customBosses: [], customPeople: [], journeyHistory: [], achievements: [], storyMarks: [], aggregateStats: { ...DEFAULT_AGGREGATE_STATS, failedRuns: {}, completedByStyle: {}, restActivities: [] } }; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
function browserStorage(): StorageLike | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
