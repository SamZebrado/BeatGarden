// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { RestCorner } from '../src/running/RestCorner';
import { RunningSimulation } from '../src/running/core/simulation';
import { ScenarioSimulation } from '../src/running/core/scenarioSimulation';
import { loadRunningSave } from '../src/running/core/save';

describe('Rest Corner and bounded Recovery Events',()=>{
  beforeEach(()=>{const values=new Map<string,string>();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key),clear:()=>values.clear(),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size;}} satisfies Storage});document.body.innerHTML='<div id="root"></div>';});
  it('launches and exits all three no-fail Rest Corner activities',()=>{
    const root=document.querySelector<HTMLElement>('#root')!;let backs=0;new RestCorner(root,()=>backs++);
    for(const id of ['breathingRing','lightPlacement','soundGarden']){root.querySelector<HTMLButtonElement>(`[data-activity="${id}"]`)!.click();expect(root.querySelector('[data-role="rest-activity"]')).not.toBeNull();root.querySelector<HTMLButtonElement>('[data-role="activity-back"]')!.click();expect(root.querySelector('[data-role="rest-corner"]')).not.toBeNull();}
    root.querySelector<HTMLButtonElement>('[data-role="back"]')!.click();expect(backs).toBe(1);expect(loadRunningSave().aggregateStats.restSessions).toBe(0);
  });
  it('completes Light Placement once with no resource or repeat-farming authority',()=>{
    const root=document.querySelector<HTMLElement>('#root')!;new RestCorner(root,()=>undefined);root.querySelector<HTMLButtonElement>('[data-activity="lightPlacement"]')!.click();for(const point of root.querySelectorAll<HTMLButtonElement>('[data-role="light-point"]')){point.click();point.click();}
    const save=loadRunningSave();expect(save.aggregateStats.restSessions).toBe(1);expect(save.aggregateStats.restActivities).toEqual(['lightPlacement']);expect(save).not.toHaveProperty('combatBonus');
  });
  it('triggers PhD Recovery deterministically, applies bounded tradeoff, and survives restore without duplication',()=>{
    const base=new RunningSimulation(91,{automaticOffense:false,firstMeetingAt:999});const state=base.exportState();state.phd.state.spirit=20;state.phd.state.pollution=80;state.phd.state.choice=null;state.phd.state.recoveryOffered=false;
    const sim=new RunningSimulation(91,{automaticOffense:false,restore:state});sim.step(1/60,{x:0,y:0});expect(sim.snapshot().phd.choice?.kind).toBe('recovery');const before=sim.snapshot().phd;expect(sim.choosePhdOption('takeBreak')).toBe(true);const after=sim.snapshot().phd;expect(after.spirit).toBeGreaterThan(before.spirit);expect(after.pollution).toBeLessThan(before.pollution);expect(after.calendarLoad).toBeGreaterThan(before.calendarLoad);
    const restored=new RunningSimulation(91,{automaticOffense:false,restore:sim.exportState()});expect(restored.snapshot().phd.recoveryOutcome).toBe('takeBreak');restored.step(1/60,{x:0,y:0});expect(restored.snapshot().phd.choice?.kind).not.toBe('recovery');
  });
  it('offers the same bounded tradeoff in Master/Work and Keep Pushing is not a fail state',()=>{
    const base=new ScenarioSimulation('work',101,'garden',{automaticOffense:false,damageEnabled:false});const state=base.exportState();state.choice=null;state.spirit=18;state.calendar=82;state.recoveryOffered=false;
    const sim=new ScenarioSimulation('work',101,'garden',{automaticOffense:false,damageEnabled:false,restore:state});sim.step(1/60,{x:0,y:0});expect(sim.snapshot().choice?.kind).toBe('recovery');expect(sim.choose('keepPushing')).toBe(true);expect(sim.snapshot().recovery.outcome).toBe('keepPushing');expect(sim.snapshot().gameOver).toBe(false);expect(sim.snapshot().completed).toBe(false);
  });
});
