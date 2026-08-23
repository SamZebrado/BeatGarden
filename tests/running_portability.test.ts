import { describe, expect, it } from 'vitest';
import { promotedPlayerBoss } from '../src/running/core/bossSchema';
import { CURRENT_RUN_STORAGE_KEY, type CurrentRunV1 } from '../src/running/core/currentRun';
import { PERSON_CORES } from '../src/running/core/people';
import { CUSTOM_CONTENT_SCHEMA, SAVE_BUNDLE_SCHEMA, applyCustomContentBundle, applyRunningSaveBundle, createCustomContentBundle, createRunningSaveBundle, mergeCustomContent, parseCustomContentBundle, parseRunningSaveBundle, type PortabilityStorage } from '../src/running/core/portability';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY, loadRunningSave } from '../src/running/core/save';
import { RunningSimulation } from '../src/running/core/simulation';

function memoryStorage(initial: Record<string, string> = {}): PortabilityStorage & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); }, values };
}

function run(simulation: RunningSimulation, frames: number, offset = 0): void {
  for (let frame = 0; frame < frames; frame += 1) {
    const state = simulation.snapshot();
    if (state.phd.choice) simulation.choosePhdOption(state.phd.choice.options[0]);
    if (state.upgradePending) simulation.chooseUpgrade('cadence');
    simulation.step(1 / 60, { x: Math.cos((frame + offset) / 71), y: Math.sin((frame + offset) / 83) });
  }
}

describe('Running data portability', () => {
  it('exports meta plus unfinished state without mutating storage', () => {
    const simulation = new RunningSimulation(211, { difficulty: 'storm' });
    run(simulation, 600);
    const current: CurrentRunV1 = { version: 1, status: 'active', savedAt: 100, seed: 211, world: 'phd', difficulty: 'storm', simulation: simulation.exportState() };
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify({ ...DEFAULT_RUNNING_SAVE, totalRuns: 4 }), [CURRENT_RUN_STORAGE_KEY]: JSON.stringify(current), rhythm: 'untouched' });
    const before = new Map(storage.values);
    const bundle = createRunningSaveBundle(storage);
    expect(bundle).toMatchObject({ schema: SAVE_BUNDLE_SCHEMA, version: 1, meta: { totalRuns: 4 }, currentRun: { seed: 211, world: 'phd' } });
    expect(storage.values).toEqual(before);
  });

  it('round-trips RNG and relationship-bearing future state exactly', () => {
    const original = new RunningSimulation(223, { difficulty: 'garden' });
    run(original, 1000);
    const current: CurrentRunV1 = { version: 1, status: 'active', savedAt: 100, seed: 223, world: 'phd', difficulty: 'garden', simulation: original.exportState() };
    const source = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify(DEFAULT_RUNNING_SAVE), [CURRENT_RUN_STORAGE_KEY]: JSON.stringify(current) });
    const parsed = parseRunningSaveBundle(JSON.stringify(createRunningSaveBundle(source)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || !parsed.value.currentRun) return;
    const destination = memoryStorage({ rhythm: 'keep-me' });
    applyRunningSaveBundle(parsed.value, destination);
    const imported = JSON.parse(destination.getItem(CURRENT_RUN_STORAGE_KEY)!) as CurrentRunV1;
    const restored = new RunningSimulation(imported.seed, { difficulty: imported.difficulty, restore: imported.simulation as ReturnType<RunningSimulation['exportState']> });
    run(original, 720, 1000);
    run(restored, 720, 1000);
    expect(restored.exportState()).toEqual(original.exportState());
    expect(destination.getItem('rhythm')).toBe('keep-me');
  });

  it.each([
    '{bad',
    JSON.stringify({ schema: 'wrong', version: 1 }),
    JSON.stringify({ schema: SAVE_BUNDLE_SCHEMA, version: 2, exportedAt: new Date().toISOString(), meta: DEFAULT_RUNNING_SAVE, currentRun: null }),
    JSON.stringify({ schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: new Date().toISOString(), meta: { ...DEFAULT_RUNNING_SAVE, totalRuns: -1 }, currentRun: null }),
    JSON.stringify({ schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: new Date().toISOString(), meta: DEFAULT_RUNNING_SAVE, currentRun: { version: 1 } }),
  ])('rejects malformed, wrong-version, and corrupt nested bundles without mutation', (payload) => {
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: 'old-meta', [CURRENT_RUN_STORAGE_KEY]: 'old-run', rhythm: 'old-rhythm' });
    const before = new Map(storage.values);
    expect(parseRunningSaveBundle(payload).ok).toBe(false);
    expect(storage.values).toEqual(before);
  });

  it('rolls back both Running keys if a transactional write fails', () => {
    const source = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify(DEFAULT_RUNNING_SAVE) });
    const bundle = createRunningSaveBundle(source);
    const base = memoryStorage({ [RUNNING_STORAGE_KEY]: 'old-meta', [CURRENT_RUN_STORAGE_KEY]: 'old-run', rhythm: 'safe' });
    let writes = 0;
    const failing: PortabilityStorage = {
      getItem: base.getItem,
      setItem: (key, value) => { writes += 1; if (writes === 2) throw new Error('quota'); base.setItem(key, value); },
      removeItem: base.removeItem,
    };
    const withRun = { ...bundle, currentRun: { version: 1, status: 'active', savedAt: 1, seed: 1, world: 'phd', difficulty: 'garden', simulation: new RunningSimulation(1).exportState() } as CurrentRunV1 };
    expect(() => applyRunningSaveBundle(withRun, failing)).toThrow('quota');
    expect(base.getItem(RUNNING_STORAGE_KEY)).toBe('old-meta');
    expect(base.getItem(CURRENT_RUN_STORAGE_KEY)).toBe('old-run');
    expect(base.getItem('rhythm')).toBe('safe');
  });

  it('imports pre-Person-System v2 meta by adding an empty Person library', () => {
    const oldMeta = structuredClone(DEFAULT_RUNNING_SAVE) as Record<string, unknown>;
    delete oldMeta.customPeople;
    const bundle = { schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: new Date().toISOString(), meta: oldMeta, currentRun: null };
    const parsed = parseRunningSaveBundle(JSON.stringify(bundle));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value.meta.customPeople).toEqual([]);
  });

  it('migrates old current-run relationship omissions but rejects unknown nested content', () => {
    const simulation = new RunningSimulation(229).exportState();
    delete (simulation.phd.state as { relationship?: unknown }).relationship;
    const oldRun = { version: 1, status: 'active', savedAt: 1, seed: 229, world: 'phd', difficulty: 'garden', simulation };
    const bundle = { schema: SAVE_BUNDLE_SCHEMA, version: 1, exportedAt: '2026-08-23T00:00:00.000Z', meta: DEFAULT_RUNNING_SAVE, currentRun: oldRun };
    const migrated = parseRunningSaveBundle(JSON.stringify(bundle));
    expect(migrated.ok).toBe(true);
    if (migrated.ok && migrated.value.currentRun?.world === 'phd') expect(migrated.value.currentRun.simulation.phd.state.relationship).toBeDefined();
    const unsafe = structuredClone(bundle) as any;
    unsafe.currentRun.simulation.phd.state.script = 'fetch("https://example.test")';
    expect(parseRunningSaveBundle(JSON.stringify(unsafe))).toMatchObject({ ok: false });
  });

  it('round-trips custom and promoted Bosses plus People with stable-ID replacement', () => {
    const promoted = promotedPlayerBoss({ world: 'work', completionNumber: 2, difficulty: 'storm', orbitCount: 5, energy: 70, focus: 80, spirit: 60 });
    const custom = { ...promoted, id: 'mentor-echo', origin: 'custom' as const, name: { en: 'Mentor Echo', 'zh-CN': '导师回声' } };
    const initial = { ...DEFAULT_RUNNING_SAVE, customPeople: [PERSON_CORES.mei], customBosses: [
      { id: promoted.id, displayName: promoted.name.en, origin: promoted.origin, worlds: [...promoted.worlds], updatedAt: '2026-08-23T00:00:00Z', data: promoted },
      { id: custom.id, displayName: custom.name.en, origin: custom.origin, worlds: [...custom.worlds], updatedAt: '2026-08-23T00:00:00Z', data: custom },
    ] };
    const bundle = createCustomContentBundle(initial);
    expect(bundle.schema).toBe(CUSTOM_CONTENT_SCHEMA);
    expect(parseCustomContentBundle(JSON.stringify(bundle)).ok).toBe(true);
    const replacement = structuredClone(PERSON_CORES.mei);
    replacement.name.en = 'Mei Updated';
    const sameNameDifferentId = structuredClone(PERSON_CORES.mei);
    sameNameDifferentId.id = 'mei-copy';
    const merged = mergeCustomContent(initial, { ...bundle, people: [replacement, sameNameDifferentId] });
    expect(merged.customPeople.find((person) => person.id === 'mei')?.name.en).toBe('Mei Updated');
    expect(merged.customPeople.find((person) => person.id === 'mei-copy')?.name.en).toBe('Mei');
    expect(merged.customBosses.map((boss) => boss.origin)).toEqual(expect.arrayContaining(['custom', 'promoted-player']));
  });

  it('rejects executable or extension fields in custom Person and Boss data', () => {
    const content = createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customPeople: [PERSON_CORES.mei] });
    const personUnsafe = { ...content, people: [{ ...PERSON_CORES.mei, script: 'alert(1)' }] };
    expect(parseCustomContentBundle(JSON.stringify(personUnsafe)).ok).toBe(false);
    const boss = promotedPlayerBoss({ world: 'phd', completionNumber: 1, difficulty: 'garden', orbitCount: 2, energy: 60, focus: 60, spirit: 60 });
    const bossUnsafe = { ...content, bosses: [{ ...boss, onLoad: 'fetch("x")' }] };
    expect(parseCustomContentBundle(JSON.stringify(bossUnsafe)).ok).toBe(false);
  });

  it('applies custom content in one meta transaction and never touches current-run or Rhythm data', () => {
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify(DEFAULT_RUNNING_SAVE), [CURRENT_RUN_STORAGE_KEY]: 'checkpoint', rhythm: 'score' });
    const bundle = createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customPeople: [PERSON_CORES.lin] });
    expect(applyCustomContentBundle(bundle, storage).customPeople[0].id).toBe('lin');
    expect(loadRunningSave(storage).customPeople[0].id).toBe('lin');
    expect(storage.getItem(CURRENT_RUN_STORAGE_KEY)).toBe('checkpoint');
    expect(storage.getItem('rhythm')).toBe('score');
  });

  it('rejects new People at capacity but permits stable-ID replacement without mutation on rejection', () => {
    const people = Array.from({ length: 50 }, (_, index) => ({ ...structuredClone(PERSON_CORES.mei), id: `person-${index}` }));
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify({ ...DEFAULT_RUNNING_SAVE, customPeople: people }) });
    const before = storage.getItem(RUNNING_STORAGE_KEY);
    const added = { ...structuredClone(PERSON_CORES.lin), id: 'person-new' };
    expect(() => applyCustomContentBundle(createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customPeople: [added] }), storage)).toThrow('cannot exceed 50');
    expect(storage.getItem(RUNNING_STORAGE_KEY)).toBe(before);

    const replacement = { ...structuredClone(PERSON_CORES.lin), id: 'person-0' };
    const result = applyCustomContentBundle(createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customPeople: [replacement] }), storage);
    expect(result.customPeople).toHaveLength(50);
    expect(result.customPeople[0].name.en).toBe(PERSON_CORES.lin.name.en);
  });

  it('rejects new Bosses at capacity but permits stable-ID replacement without mutation on rejection', () => {
    const template = promotedPlayerBoss({ world: 'work', completionNumber: 3, difficulty: 'garden', orbitCount: 3, energy: 60, focus: 60, spirit: 60 });
    const bosses = Array.from({ length: 50 }, (_, index) => {
      const data = { ...structuredClone(template), id: `boss-${index}` };
      return { id: data.id, displayName: data.name.en, origin: data.origin, worlds: [...data.worlds], updatedAt: '2026-08-23T00:00:00.000Z', data };
    });
    const storage = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify({ ...DEFAULT_RUNNING_SAVE, customBosses: bosses }) });
    const before = storage.getItem(RUNNING_STORAGE_KEY);
    const added = { ...structuredClone(template), id: 'boss-new' };
    expect(() => applyCustomContentBundle(createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customBosses: [{ id: added.id, displayName: added.name.en, origin: added.origin, worlds: [...added.worlds], updatedAt: '2026-08-23T00:00:00.000Z', data: added }] }), storage)).toThrow('cannot exceed 50');
    expect(storage.getItem(RUNNING_STORAGE_KEY)).toBe(before);

    const replacement = { ...structuredClone(template), id: 'boss-0', name: { en: 'Replacement Boss', 'zh-CN': '替换 Boss' } };
    const result = applyCustomContentBundle(createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customBosses: [{ id: replacement.id, displayName: replacement.name.en, origin: replacement.origin, worlds: [...replacement.worlds], updatedAt: '2026-08-23T00:00:00.000Z', data: replacement }] }), storage);
    expect(result.customBosses).toHaveLength(50);
    expect(result.customBosses[0].displayName).toBe('Replacement Boss');
  });

  it('rolls custom content back when post-write storage differs while remaining valid', () => {
    const base = memoryStorage({ [RUNNING_STORAGE_KEY]: JSON.stringify(DEFAULT_RUNNING_SAVE) });
    const previous = base.getItem(RUNNING_STORAGE_KEY);
    let corruptNextWrite = true;
    const altering: PortabilityStorage = {
      getItem: base.getItem,
      setItem: (key, value) => {
        if (corruptNextWrite) {
          corruptNextWrite = false;
          const parsed = JSON.parse(value) as typeof DEFAULT_RUNNING_SAVE;
          base.setItem(key, JSON.stringify({ ...parsed, totalRuns: parsed.totalRuns + 1 }));
        } else base.setItem(key, value);
      },
      removeItem: base.removeItem,
    };
    const bundle = createCustomContentBundle({ ...DEFAULT_RUNNING_SAVE, customPeople: [PERSON_CORES.lin] });
    expect(() => applyCustomContentBundle(bundle, altering)).toThrow('did not verify');
    expect(base.getItem(RUNNING_STORAGE_KEY)).toBe(previous);
  });
});
