import { describe, expect, it } from 'vitest';
import { BubbleKitchenStage, CloudPostStage, SleepyGreenhouseStage } from '../src/stages/original/GardenStages';

const stages = [new BubbleKitchenStage(), new CloudPostStage(), new SleepyGreenhouseStage()];

describe('additional original stage content', () => {
  it('provides four built-in stages total with unique stable identities', () => {
    expect(stages.map((stage) => stage.id)).toEqual(['bubble-kitchen', 'cloud-post', 'sleepy-greenhouse']);
    expect(new Set(stages.map((stage) => stage.id)).size).toBe(3);
  });

  it('gives every stage a complete procedural score and playable targets', () => {
    for (const stage of stages) {
      const events = stage.buildEvents();
      const audio = events.filter((event) => event.type === 'audio');
      const targets = events.filter((event) => event.type === 'judge-target');
      expect(audio.length).toBeGreaterThan(70);
      expect(targets.length).toBeGreaterThanOrEqual(10);
      expect(Math.max(...targets.map((target) => target.beat))).toBeLessThan(stage.totalBeats());
      expect(new Set(targets.map((target) => target.id)).size).toBe(targets.length);
    }
  });

  it('uses mechanically distinct input vocabularies', () => {
    const kinds = stages.map((stage) => new Set(stage.buildEvents()
      .filter((event) => event.type === 'judge-target')
      .map((event) => event.inputKind)));
    expect([...kinds[0]]).toEqual(['tap']);
    expect([...kinds[1]].sort()).toEqual(['swipeLeft', 'swipeRight']);
    expect([...kinds[2]].sort()).toEqual(['holdRelease', 'holdStart']);
  });

  it('pairs each greenhouse hold start with an authored release target', () => {
    const targets = new SleepyGreenhouseStage().buildEvents().filter((event) => event.type === 'judge-target');
    const ids = new Set(targets.map((target) => target.id));
    for (const target of targets.filter((item) => item.inputKind === 'holdStart')) {
      expect(target.pairedId).toBeTruthy();
      expect(ids.has(target.pairedId!)).toBe(true);
    }
  });
});
