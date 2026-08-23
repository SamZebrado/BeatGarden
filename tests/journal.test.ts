import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, JOURNEY_SCHEMA, MAX_JOURNEY_RECORDS, STORY_MARKS, type JourneyCompletionInput } from '../src/running/core/journal';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY, loadRunningSave, recordRestActivity, recordSuccessfulJourney } from '../src/running/core/save';
import { applyRunningSaveBundle, createRunningSaveBundle, type PortabilityStorage } from '../src/running/core/portability';

function storage(initial: Record<string,string> = {}): PortabilityStorage & { values: Map<string,string> } { const values=new Map(Object.entries(initial)); return { values, getItem:key=>values.get(key)??null, setItem:(key,value)=>void values.set(key,value), removeItem:key=>void values.delete(key) }; }
function input(id: string, world: 'phd'|'master'|'work'='phd'): JourneyCompletionInput { const order=Number(id.replace(/\D/g,'')||0); return { sourceRunId:id, completedAt:new Date(Date.UTC(2026,7,1,0,0,order)).toISOString(), world, difficulty:'garden', runDuration:100, finalStage:'complete', personCode:'CL-AU', routeChoices:['route'], relationship:null, build:{orbit:1,cadence:0,vitality:0}, resources:{energy:60,focus:70,spirit:80}, milestones:[`${world}:complete`], storyMarks:['held-boundary'], musicStyle:'classic' }; }

describe('Garden Journal durable authority',()=>{
  it('records a successful journey exactly once and unlocks idempotently',()=>{
    const target=storage(); const first=recordSuccessfulJourney(input('run-1'),target); const second=recordSuccessfulJourney(input('run-1'),target);
    expect(first.duplicate).toBe(false); expect(second.duplicate).toBe(true); expect(loadRunningSave(target).journeyHistory).toHaveLength(1);
    expect(loadRunningSave(target).achievements.filter(id=>id==='first-journey')).toEqual(['first-journey']);
  });
  it('drops the oldest records deterministically above the 200-record bound',()=>{
    const target=storage(); for(let index=0;index<MAX_JOURNEY_RECORDS+3;index+=1) recordSuccessfulJourney(input(`run-${index}`,(['phd','master','work'] as const)[index%3]),target);
    const history=loadRunningSave(target).journeyHistory; expect(history).toHaveLength(MAX_JOURNEY_RECORDS); expect(history.some(record=>record.recordId==='run-0')).toBe(false); expect(history.at(-1)?.recordId).toBe('run-202');
  });
  it('keeps Story Marks independent from medals and cosmetic rewards outside combat authority',()=>{
    const target=storage(); const result=recordSuccessfulJourney({...input('run-story'),storyMarks:['noise-but-useful'],achievementSignals:[]},target);
    expect(result.record.storyMarks).toEqual(['noise-but-useful']); expect(result.record.medalsUnlocked).toContain('first-journey');
    expect(ACHIEVEMENTS.every(item=>typeof item.cosmetic==='string')).toBe(true); expect(Object.keys(STORY_MARKS)).not.toContain('first-journey');
    expect(result.record).not.toHaveProperty('damage'); expect(result.record).not.toHaveProperty('hpBonus');
  });
  it('persists Journal, Rest, audio and achievements through whole-save export/import without Rhythm mutation',()=>{
    const source=storage({rhythm:'source-rhythm'}); recordSuccessfulJourney(input('portable'),source); recordRestActivity('breathingRing',source);
    const save=loadRunningSave(source); source.setItem(RUNNING_STORAGE_KEY,JSON.stringify({...save,musicStyle:'chiptune',dynamicIntensity:'soft'}));
    const bundle=createRunningSaveBundle(source); const destination=storage({rhythm:'keep'}); applyRunningSaveBundle(bundle,destination); const imported=loadRunningSave(destination);
    expect(imported.journeyHistory[0].schema).toBe(JOURNEY_SCHEMA); expect(imported.musicStyle).toBe('chiptune'); expect(imported.aggregateStats.restSessions).toBe(1); expect(destination.getItem('rhythm')).toBe('keep');
  });
  it('migrates old v2 saves and rejects corrupt Journal data in strict imports',()=>{
    const old:any={...DEFAULT_RUNNING_SAVE}; for(const key of ['journeyHistory','achievements','storyMarks','aggregateStats','musicStyle','runningMusicVolume','runningSfxVolume','dynamicIntensity']) delete old[key];
    const target=storage({[RUNNING_STORAGE_KEY]:JSON.stringify(old)}); expect(loadRunningSave(target).journeyHistory).toEqual([]);
    const corrupt={...createRunningSaveBundle(target),meta:{...loadRunningSave(target),journeyHistory:[{schema:JOURNEY_SCHEMA,script:'run()'}]}};
    const before=new Map(target.values); expect(()=>applyRunningSaveBundle(corrupt as any,target)).toThrow(); expect(target.values).toEqual(before);
  });
});
