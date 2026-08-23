// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { RUNNING_MUSIC_STYLES, musicIntervalMs } from '../src/running/RunningAudio';
import { DEFAULT_RUNNING_SAVE, RUNNING_STORAGE_KEY, loadRunningSave, updateRunningSave } from '../src/running/core/save';
import { RunningSimulation } from '../src/running/core/simulation';

describe('Running selectable music styles',()=>{
  beforeEach(()=>{const values=new Map<string,string>();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>void values.set(key,value),removeItem:(key:string)=>void values.delete(key),clear:()=>values.clear(),key:(index:number)=>[...values.keys()][index]??null,get length(){return values.size;}} satisfies Storage});});
  it('ships Classic, restrained chiptune, and Quiet Organic immediately',()=>{expect(Object.keys(RUNNING_MUSIC_STYLES)).toEqual(['classic','chiptune','organic']);expect(RUNNING_MUSIC_STYLES.chiptune.patch).toBe('lead');expect(musicIntervalMs('phd','organic')).toBeGreaterThan(musicIntervalMs('phd','classic'));});
  it('migrates defaults and persists style, volumes, mute and intensity',()=>{window.localStorage.setItem(RUNNING_STORAGE_KEY,JSON.stringify(DEFAULT_RUNNING_SAVE));expect(loadRunningSave().musicStyle).toBe('classic');updateRunningSave({musicStyle:'chiptune',runningMusicVolume:.4,runningSfxVolume:.3,dynamicIntensity:'soft',audioMuted:true});expect(loadRunningSave()).toMatchObject({musicStyle:'chiptune',runningMusicVolume:.4,runningSfxVolume:.3,dynamicIntensity:'soft',audioMuted:true});});
  it('does not mutate gameplay or consume RNG when preference changes',()=>{const sim=new RunningSimulation(44);const before=sim.exportState();updateRunningSave({musicStyle:'organic',dynamicIntensity:'off'});expect(sim.exportState()).toEqual(before);});
});
