// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { CURRENT_RUN_STORAGE_KEY, loadCurrentRun } from '../src/running/core/currentRun';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY, loadRunningSave, recordSlowlyReflection } from '../src/running/core/save';
import { SlowlyIslandHost } from '../src/running/slowly/SlowlyIslandHost';
import { GardenJournal } from '../src/running/GardenJournal';
import { createRunningSaveBundle, parseRunningSaveBundle } from '../src/running/core/portability';
import { MAX_PRIVATE_CODE_POINTS, SLOWLY_PRIVATE_STORAGE_KEY, boundedPrivateText, cleanupOrphanPrivateRecords, deletePrivateRecord, readPrivateRecord, writePrivateRecord } from '../src/running/slowly/core/slowlyPersistence';
import { createSlowlyState, isSlowlyJourneyStateV1 } from '../src/running/slowly/core/slowlyState';
import { FEELINGS, NEEDS } from '../src/running/slowly/core/slowlyVocabulary';

describe('Slowly Island B1 vertical slice', () => {
  beforeEach(() => {
    const values = new Map<string,string>();
    const storage: Storage = {
      get length(){ return values.size; }, clear(){ values.clear(); }, getItem(key){ return values.get(key) ?? null; },
      key(index){ return [...values.keys()][index] ?? null; }, removeItem(key){ values.delete(key); }, setItem(key,value){ values.set(key,String(value)); },
    };
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  });

  it('keeps the editorial vocabulary bounded and bilingual', () => {
    expect(FEELINGS).toHaveLength(36);
    expect(NEEDS).toHaveLength(24);
    expect(FEELINGS.every((word) => word.id && word.en && word.zh)).toBe(true);
    expect(NEEDS.every((word) => word.id && word.en && word.zh)).toBe(true);
  });

  it('strictly validates semantic state and rejects unknown fields', () => {
    const state = createSlowlyState(100);
    expect(isSlowlyJourneyStateV1(state)).toBe(true);
    expect(isSlowlyJourneyStateV1({ ...state, diagnosis: 'anxiety' })).toBe(false);
    expect(isSlowlyJourneyStateV1({ ...state, selectedFeelings: ['a', 'b', 'c', 'd'] })).toBe(false);
    expect(isSlowlyJourneyStateV1({ ...state, selectedFeelings: ['syntactically-safe-but-unknown'] })).toBe(false);
    expect(isSlowlyJourneyStateV1({ ...state, selectedNeeds: ['unknown-need'] })).toBe(false);
    expect(isSlowlyJourneyStateV1({ ...state, phase:'record', recordOrigin:'ended' })).toBe(false);
    expect(isSlowlyJourneyStateV1({ ...state, phase:'ended' })).toBe(false);
    expect(isSlowlyJourneyStateV1({ ...state, phase:'record', recordOrigin:'record' })).toBe(false);
  });

  it('rolls back a private deletion failure and cleans only orphan records', () => {
    const kept = { version: 1 as const, id: 'slowly-kept', situation: 'keep', mirror: '', bridge: '', companionPrompt: '', updatedAt: 1 };
    const orphan = { ...kept, id: 'slowly-orphan', situation: 'remove' };
    writePrivateRecord(kept); writePrivateRecord(orphan);
    cleanupOrphanPrivateRecords(new Set(['slowly-kept']));
    expect(readPrivateRecord('slowly-kept')).toEqual(kept);
    expect(readPrivateRecord('slowly-orphan')).toBeNull();
    const raw = localStorage.getItem(SLOWLY_PRIVATE_STORAGE_KEY)!;
    const failing = { getItem: localStorage.getItem.bind(localStorage), setItem: localStorage.setItem.bind(localStorage), removeItem: () => { throw new Error('remove failed'); } };
    localStorage.setItem(SLOWLY_PRIVATE_STORAGE_KEY, JSON.stringify({ version: 1, records: [orphan] }));
    expect(() => deletePrivateRecord('slowly-orphan', failing)).toThrow('remove failed');
    expect(localStorage.getItem(SLOWLY_PRIVATE_STORAGE_KEY)).toContain('slowly-orphan');
    localStorage.setItem(SLOWLY_PRIVATE_STORAGE_KEY, raw);
  });

  it('stores bounded private text separately with readback and deletion', () => {
    const long = '🌿'.repeat(MAX_PRIVATE_CODE_POINTS + 3);
    expect([...boundedPrivateText(long)]).toHaveLength(MAX_PRIVATE_CODE_POINTS);
    const record = { version: 1 as const, id: 'slowly-1', situation: '<img onerror=alert(1)>', mirror: '', bridge: '', companionPrompt: '', updatedAt: 1 };
    writePrivateRecord(record);
    expect(readPrivateRecord('slowly-1')).toEqual(record);
    deletePrivateRecord('slowly-1');
    expect(readPrivateRecord('slowly-1')).toBeNull();
    expect(localStorage.getItem(SLOWLY_PRIVATE_STORAGE_KEY)).toBeNull();
  });

  it('records reflections separately without widening career completion semantics', () => {
    localStorage.setItem(RUNNING_STORAGE_KEY, JSON.stringify(DEFAULT_RUNNING_SAVE));
    recordSlowlyReflection({ schema:'beatgarden-reflection.v1', recordId:'slowly-2', endedAt:'2026-09-06T00:00:00.000Z', outcome:'ended-early', phaseReached:'needs', feelingIds:['worried'], needIds:['clarity'], summary:'<img onerror=alert(1)>', companion:null, gameVersion:'0.1.0' });
    const save = loadRunningSave();
    expect(save.reflections).toHaveLength(1);
    expect(save.worldCompletions).toEqual({});
    expect(save.achievements).not.toContain('three-gardens');
    expect(() => recordSlowlyReflection({ schema:'beatgarden-reflection.v1', recordId:'slowly-bad', endedAt:'2026-09-06T00:00:00.000Z', outcome:'completed', phaseReached:'unknown' as never, feelingIds:['fake'], needIds:[], summary:null, companion:null, gameVersion:'0.1.0' })).toThrow('Invalid Slowly Island');
  });

  it('creates a fresh durable identity for each successive journey', () => {
    const first=createSlowlyState(100);const second=createSlowlyState(100);
    expect(first.runId).not.toBe(second.runId);
    expect(isSlowlyJourneyStateV1(first)).toBe(true);
    expect(isSlowlyJourneyStateV1(second)).toBe(true);
  });

  it('Walk again creates a new current-run identity without replacing history', () => {
    const root=document.createElement('div');document.body.append(root);const host=new SlowlyIslandHost(root,()=>undefined);
    root.querySelector<HTMLButtonElement>('[data-role="enough"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="finish"]')!.click();
    const firstId=loadRunningSave().reflections[0].recordId;
    root.querySelector<HTMLButtonElement>('[data-role="again"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    const current=loadCurrentRun();
    expect(current?.world).toBe('slowly');
    expect(current && current.world==='slowly' ? current.simulation.runId : null).not.toBe(firstId);
    expect(loadRunningSave().reflections.map((item)=>item.recordId)).toEqual([firstId]);
    host.destroy();root.remove();
  });

  it('preserves normal Rest origin in a reloadable Record checkpoint', () => {
    const state=createSlowlyState(200);state.phase='record';state.recordOrigin='optionalRest';state.endingMode='normal';
    expect(isSlowlyJourneyStateV1(structuredClone(state))).toBe(true);
    const run={version:2 as const,status:'active' as const,savedAt:201,seed:200,world:'slowly' as const,difficulty:null,simulation:state};
    localStorage.setItem(CURRENT_RUN_STORAGE_KEY,JSON.stringify(run));
    expect(loadCurrentRun()).toEqual(run);
  });

  it('excludes private text from ordinary export and renders all authored text as text', () => {
    const privateRecord = { version:1 as const, id:'slowly-safe', situation:'<img data-private-injected="yes">', mirror:'', bridge:'', companionPrompt:'', updatedAt:1 };
    writePrivateRecord(privateRecord);
    recordSlowlyReflection({ schema:'beatgarden-reflection.v1', recordId:'slowly-safe', endedAt:'2026-09-06T00:00:00.000Z', outcome:'completed', phaseReached:'record', feelingIds:[], needIds:[], summary:'<img data-summary-injected="yes">', companion:null, gameVersion:'0.1.0' });
    const serialized = JSON.stringify(createRunningSaveBundle());
    expect(serialized).not.toContain('data-private-injected');
    expect(parseRunningSaveBundle(serialized).ok).toBe(true);
    const root=document.createElement('div');document.body.append(root);new GardenJournal(root,()=>undefined);
    expect(root.querySelector('[data-summary-injected="yes"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('button')?.click();
    const reveal=root.querySelector<HTMLButtonElement>('[data-reflection-id="slowly-safe"] button');reveal?.click();
    expect(root.querySelector('[data-private-injected="yes"]')).toBeNull();
    const removePrivate=root.querySelector<HTMLButtonElement>('[data-role="delete-private-text"]');
    expect(removePrivate).not.toBeNull();removePrivate!.click();
    expect(readPrivateRecord('slowly-safe')).toBeNull();
    expect(loadRunningSave().reflections.some((item)=>item.recordId==='slowly-safe')).toBe(true);
    root.remove();
  });

  it('writes a difficulty-null V2 checkpoint and renders user text as text, not markup', () => {
    const root = document.createElement('div'); document.body.append(root);
    const host = new SlowlyIslandHost(root, () => undefined);
    const area = root.querySelector<HTMLTextAreaElement>('[data-role="situation-text"]')!;
    area.value = '<img data-injected="yes">'; area.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    const run = loadCurrentRun();
    expect(run).toMatchObject({ version:2, world:'slowly', difficulty:null });
    expect(root.querySelector('[data-injected="yes"]')).toBeNull();
    host.destroy(); root.remove();
  });

  it('discard removes both current-run and linked private text', () => {
    const root = document.createElement('div'); document.body.append(root);
    const host = new SlowlyIslandHost(root, () => undefined);
    const checkbox = root.querySelector<HTMLInputElement>('input[type="checkbox"]')!; checkbox.click();
    const area = root.querySelector<HTMLTextAreaElement>('[data-role="situation-text"]')!; area.value='private'; area.dispatchEvent(new Event('input'));
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(SLOWLY_PRIVATE_STORAGE_KEY)).not.toBeNull();
    root.querySelector<HTMLButtonElement>('[data-role="back"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="discard"]')!.click();
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(SLOWLY_PRIVATE_STORAGE_KEY)).toBeNull();
    host.saveNow(); host.destroy();
    expect(localStorage.getItem(CURRENT_RUN_STORAGE_KEY)).toBeNull();
    root.remove();
  });

  it('persists early ending origin across reload and returns Record to its true origin', () => {
    const root=document.createElement('div');document.body.append(root);
    let host=new SlowlyIslandHost(root,()=>undefined);
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="enough"]')!.click();
    const saved=loadCurrentRun();
    expect(saved?.world).toBe('slowly');
    expect(saved && saved.world==='slowly' ? saved.simulation : null).toMatchObject({ phase:'record', recordOrigin:'feelings', endingMode:'early' });
    host.destroy();
    host=new SlowlyIslandHost(root,()=>undefined,saved && saved.world==='slowly' ? saved : undefined);
    root.querySelector<HTMLButtonElement>('[data-role="record-back"]')!.click();
    expect(root.querySelector('[data-role="slowly-island"]')?.getAttribute('data-phase')).toBe('feelings');
    host.destroy();root.remove();
  });

  it('persists the bounded Record summary draft across save and reload', () => {
    const root=document.createElement('div');document.body.append(root);let host=new SlowlyIslandHost(root,()=>undefined);
    root.querySelector<HTMLButtonElement>('[data-role="enough"]')!.click();
    const area=root.querySelector<HTMLTextAreaElement>('[data-role="reflection-summary"]')!;area.value='draft summary';area.dispatchEvent(new Event('input'));
    host.saveNow();const saved=loadCurrentRun();host.destroy();
    expect(saved&&saved.world==='slowly'?saved.simulation.summaryDraft:null).toBe('draft summary');
    host=new SlowlyIslandHost(root,()=>undefined,saved&&saved.world==='slowly'?saved:undefined);
    expect(root.querySelector<HTMLTextAreaElement>('[data-role="reflection-summary"]')!.value).toBe('draft summary');
    host.destroy();root.remove();
  });

  it('requires a kind-specific companion confirmation and labels every textarea', () => {
    const root=document.createElement('div');document.body.append(root);const host=new SlowlyIslandHost(root,()=>undefined);
    expect(root.querySelector('textarea')?.getAttribute('aria-label')).toBeTruthy();
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="needs-rest"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="companion-need"]')!.click();
    expect(root.querySelector('[data-role="confirm-need-rest"]')).not.toBeNull();
    expect(root.querySelector('[data-role="expression-mirror"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-role="confirm-need-rest"]')!.click();
    expect(root.querySelector('[data-role="expression-mirror"]')).not.toBeNull();
    host.destroy();root.remove();
  });

  it('restores meaningful focus after Back and Undo', async () => {
    const root=document.createElement('div');document.body.append(root);const host=new SlowlyIslandHost(root,()=>undefined);
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="feelings-calm"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="remove-calm"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="undo"]')!.click();
    await Promise.resolve();
    expect(root.contains(document.activeElement)).toBe(true);
    root.querySelector<HTMLButtonElement>('[data-role="next"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-role="field-back"]')!.click();
    await Promise.resolve();
    expect(document.activeElement?.tagName).toBe('H2');
    host.destroy();root.remove();
  });
});
