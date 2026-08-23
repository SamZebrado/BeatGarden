import { parseBossConfig, type BossConfigV1 } from './bossSchema';
import { CURRENT_RUN_STORAGE_KEY, isCurrentRunV1, type CurrentRunV1 } from './currentRun';
import { parsePersonCore, type PersonCoreV1 } from './personScience';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY, loadRunningSave, parseRunningSaveV2, type RunningSaveV2, type StoredBossMetadata } from './save';
import { RunningSimulation } from './simulation';
import { ScenarioSimulation } from './scenarioSimulation';

export const SAVE_BUNDLE_SCHEMA = 'beatgarden-save-bundle.v1' as const;
export const CUSTOM_CONTENT_SCHEMA = 'beatgarden-custom-content.v1' as const;

export interface RunningSaveBundleV1 {
  schema: typeof SAVE_BUNDLE_SCHEMA;
  version: 1;
  exportedAt: string;
  meta: RunningSaveV2;
  currentRun: CurrentRunV1 | null;
}

export interface CustomContentBundleV1 {
  schema: typeof CUSTOM_CONTENT_SCHEMA;
  version: 1;
  exportedAt: string;
  people: PersonCoreV1[];
  bosses: BossConfigV1[];
}

export interface ImportPreview {
  world: CurrentRunV1['world'] | null;
  difficulty: CurrentRunV1['difficulty'] | null;
  simulationTime: number | null;
  totalRuns: number;
  people: number;
  bosses: number;
}

export interface PortabilityStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createRunningSaveBundle(storage: PortabilityStorage = localStorage): RunningSaveBundleV1 {
  const reader = { getItem: (key: string) => storage.getItem(key), setItem: () => undefined };
  const meta = loadRunningSave(reader);
  const rawCurrent = parseJson(storage.getItem(CURRENT_RUN_STORAGE_KEY));
  const currentRun = isCurrentRunV1(rawCurrent) ? structuredClone(rawCurrent) : null;
  return { schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: new Date().toISOString(), meta: structuredClone(meta), currentRun };
}

export function parseRunningSaveBundle(json: string): { ok: true; value: RunningSaveBundleV1; preview: ImportPreview } | { ok: false; errors: string[] } {
  if (json.length > 2_000_000) return { ok: false, errors: ['bundle: maximum size is 2 MB.'] };
  const value = parseJson(json);
  if (!record(value)) return { ok: false, errors: ['bundle: invalid JSON object.'] };
  const unknown = Object.keys(value).filter((key) => !['schema', 'version', 'exportedAt', 'meta', 'currentRun'].includes(key));
  if (unknown.length) return { ok: false, errors: unknown.map((key) => `bundle.${key}: unknown field.`) };
  if (value.schema !== SAVE_BUNDLE_SCHEMA) return { ok: false, errors: [`schema: expected ${SAVE_BUNDLE_SCHEMA}.`] };
  if (value.version !== 1) return { ok: false, errors: ['version: unsupported save bundle version.'] };
  if (!validIsoDate(value.exportedAt)) return { ok: false, errors: ['exportedAt: expected an ISO date.'] };
  const meta = parseRunningSaveV2(value.meta);
  if (!meta.ok) return { ok: false, errors: meta.errors };
  if (value.currentRun !== null && !isCurrentRunV1(value.currentRun)) return { ok: false, errors: ['currentRun: invalid Running checkpoint.'] };
  const currentRun = value.currentRun === null ? null : normalizeCurrentRun(value.currentRun);
  if (value.currentRun !== null && currentRun === null) return { ok: false, errors: ['currentRun: unknown or non-authoritative fields are not allowed.'] };
  const bundle: RunningSaveBundleV1 = { schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: value.exportedAt, meta: meta.value, currentRun };
  return { ok: true, value: bundle, preview: previewRunningBundle(bundle) };
}

export function previewRunningBundle(bundle: RunningSaveBundleV1): ImportPreview {
  const simulation = bundle.currentRun?.simulation as { time?: number } | undefined;
  return { world: bundle.currentRun?.world ?? null, difficulty: bundle.currentRun?.difficulty ?? null, simulationTime: typeof simulation?.time === 'number' ? simulation.time : null, totalRuns: bundle.meta.totalRuns, people: bundle.meta.customPeople.length, bosses: bundle.meta.customBosses.length };
}

/** Fully validate before writing; roll back both Running keys on any write/verify failure. */
export function applyRunningSaveBundle(bundle: RunningSaveBundleV1, storage: PortabilityStorage = localStorage): void {
  const validated = parseRunningSaveBundle(JSON.stringify(bundle));
  if (!validated.ok) throw new Error(validated.errors.join('\n'));
  const previousMeta = storage.getItem(RUNNING_STORAGE_KEY);
  const previousCurrent = storage.getItem(CURRENT_RUN_STORAGE_KEY);
  try {
    storage.setItem(RUNNING_STORAGE_KEY, JSON.stringify(validated.value.meta));
    if (validated.value.currentRun) storage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(validated.value.currentRun));
    else storage.removeItem(CURRENT_RUN_STORAGE_KEY);
    const verifiedMeta = parseRunningSaveV2(parseJson(storage.getItem(RUNNING_STORAGE_KEY)));
    const verifiedCurrent = parseJson(storage.getItem(CURRENT_RUN_STORAGE_KEY));
    if (!verifiedMeta.ok || JSON.stringify(verifiedMeta.value) !== JSON.stringify(validated.value.meta)
      || (validated.value.currentRun ? !isCurrentRunV1(verifiedCurrent) || JSON.stringify(verifiedCurrent) !== JSON.stringify(validated.value.currentRun) : verifiedCurrent !== null)) {
      throw new Error('Imported Running state did not verify.');
    }
  } catch (error) {
    restoreKey(storage, RUNNING_STORAGE_KEY, previousMeta);
    restoreKey(storage, CURRENT_RUN_STORAGE_KEY, previousCurrent);
    throw error;
  }
}

export function createCustomContentBundle(save: RunningSaveV2 = DEFAULT_RUNNING_SAVE): CustomContentBundleV1 {
  return { schema: CUSTOM_CONTENT_SCHEMA, version: 1, exportedAt: new Date().toISOString(), people: save.customPeople.map((person) => structuredClone(person)), bosses: save.customBosses.map((boss) => structuredClone(boss.data) as BossConfigV1) };
}

export function parseCustomContentBundle(json: string): { ok: true; value: CustomContentBundleV1 } | { ok: false; errors: string[] } {
  if (json.length > 2_000_000) return { ok: false, errors: ['content: maximum size is 2 MB.'] };
  const value = parseJson(json);
  if (!record(value)) return { ok: false, errors: ['content: invalid JSON object.'] };
  const unknown = Object.keys(value).filter((key) => !['schema', 'version', 'exportedAt', 'people', 'bosses'].includes(key));
  if (unknown.length) return { ok: false, errors: unknown.map((key) => `content.${key}: unknown field.`) };
  if (value.schema !== CUSTOM_CONTENT_SCHEMA || value.version !== 1 || !validIsoDate(value.exportedAt)) return { ok: false, errors: ['content: unsupported schema, version, or export date.'] };
  if (!Array.isArray(value.people) || value.people.length > 50 || !Array.isArray(value.bosses) || value.bosses.length > 50) return { ok: false, errors: ['content: expected at most 50 People and 50 Bosses.'] };
  const people: PersonCoreV1[] = [];
  const bosses: BossConfigV1[] = [];
  const errors: string[] = [];
  for (const [index, person] of value.people.entries()) { const parsed = parsePersonCore(person); if (parsed.ok) people.push(parsed.value); else errors.push(...parsed.errors.map((error) => `people[${index}].${error}`)); }
  for (const [index, boss] of value.bosses.entries()) { const parsed = parseBossConfig(JSON.stringify(boss)); if (parsed.ok && parsed.value) bosses.push(parsed.value); else errors.push(...parsed.errors.map((error) => `bosses[${index}].${error}`)); }
  return errors.length ? { ok: false, errors } : { ok: true, value: { schema: CUSTOM_CONTENT_SCHEMA, version: 1, exportedAt: value.exportedAt, people, bosses } };
}

/** Stable-ID replacement semantics, performed in memory before the single meta write. */
export function mergeCustomContent(save: RunningSaveV2, bundle: CustomContentBundleV1): RunningSaveV2 {
  const people = [...save.customPeople];
  for (const person of bundle.people) { const index = people.findIndex((item) => item.id === person.id); if (index >= 0) people[index] = structuredClone(person); else people.push(structuredClone(person)); }
  const bosses = [...save.customBosses];
  for (const boss of bundle.bosses) {
    const stored: StoredBossMetadata = { id: boss.id, displayName: boss.name.en, origin: boss.origin, worlds: [...boss.worlds], updatedAt: bundle.exportedAt, data: structuredClone(boss) };
    const index = bosses.findIndex((item) => item.id === boss.id); if (index >= 0) bosses[index] = stored; else bosses.push(stored);
  }
  if (people.length > 50) throw new Error('Custom Person library cannot exceed 50 entries. Replace an existing stable ID or remove an entry first.');
  if (bosses.length > 50) throw new Error('Custom Boss library cannot exceed 50 entries. Replace an existing stable ID or remove an entry first.');
  return { ...save, customPeople: people, customBosses: bosses };
}

export function applyCustomContentBundle(bundle: CustomContentBundleV1, storage: PortabilityStorage = localStorage): RunningSaveV2 {
  const parsed = parseCustomContentBundle(JSON.stringify(bundle));
  if (!parsed.ok) throw new Error(parsed.errors.join('\n'));
  const previous = storage.getItem(RUNNING_STORAGE_KEY);
  const reader = { getItem: (key: string) => storage.getItem(key), setItem: () => undefined };
  const candidate = mergeCustomContent(loadRunningSave(reader), parsed.value);
  try {
    storage.setItem(RUNNING_STORAGE_KEY, JSON.stringify(candidate));
    const verified = parseRunningSaveV2(parseJson(storage.getItem(RUNNING_STORAGE_KEY)));
    if (!verified.ok || JSON.stringify(verified.value) !== JSON.stringify(candidate)) throw new Error('Imported custom content did not verify.');
    return verified.value;
  } catch (error) {
    restoreKey(storage, RUNNING_STORAGE_KEY, previous);
    throw error;
  }
}

function restoreKey(storage: PortabilityStorage, key: string, value: string | null): void { try { if (value === null) storage.removeItem(key); else storage.setItem(key, value); } catch { /* best-effort rollback after the original storage failure */ } }
function normalizeCurrentRun(run: CurrentRunV1): CurrentRunV1 | null {
  const supplied = structuredClone(run) as CurrentRunV1;
  const simulation = run.world === 'phd'
    ? new RunningSimulation(run.seed, { difficulty: run.difficulty, restore: run.simulation }).exportState()
    : new ScenarioSimulation(run.world, run.seed, run.difficulty, { restore: run.simulation }).exportState();
  const normalized = { ...run, simulation } as CurrentRunV1;
  // Relationship fields were additive to the existing v1 checkpoint. Explicitly
  // migrate their absence, then compare against an engine re-export so unknown or
  // non-authoritative nested fields cannot ride inside an otherwise valid envelope.
  if (run.world === 'phd') {
    const phdState = (supplied.simulation as ReturnType<RunningSimulation['exportState']>).phd.state;
    if (phdState.relationship === undefined) phdState.relationship = (simulation as ReturnType<RunningSimulation['exportState']>).phd.state.relationship;
  } else {
    const scenario = supplied.simulation as ReturnType<ScenarioSimulation['exportState']>;
    if (scenario.relationships === undefined) scenario.relationships = {};
  }
  return canonical(supplied) === canonical(normalized) ? structuredClone(normalized) : null;
}
function parseJson(value: string | null): unknown { try { return JSON.parse(value ?? 'null'); } catch { return null; } }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function validIsoDate(value: unknown): value is string { if (typeof value !== 'string') return false; const time = Date.parse(value); return Number.isFinite(time) && new Date(time).toISOString() === value; }
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value);
}
