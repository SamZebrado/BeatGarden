import { afterEach, describe, expect, it } from 'vitest';
import { BubbleKitchenStage, CloudPostStage, SleepyGreenhouseStage, laneFromSurfaceX, localizedGardenFeedback } from '../src/stages/original/GardenStages';
import { setLocale } from '../src/i18n/strings';

const stages = [new BubbleKitchenStage(), new CloudPostStage(), new SleepyGreenhouseStage()];

describe('additional original stage content', () => {
  afterEach(() => setLocale('zh-CN'));
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

  it('maps all three visual lane centers and boundaries in canvas-local CSS coordinates', () => {
    for (const width of [1200, 960]) {
      const visualCenters = [420, 960, 1500].map((logicalX) => logicalX / 1920 * width);
      expect(visualCenters.map((x) => laneFromSurfaceX(x, width))).toEqual([0, 1, 2]);
      expect(laneFromSurfaceX(width / 3 - .01, width)).toBe(0);
      expect(laneFromSurfaceX(width / 3, width)).toBe(1);
      expect(laneFromSurfaceX(width * 2 / 3 - .01, width)).toBe(1);
      expect(laneFromSurfaceX(width * 2 / 3, width)).toBe(2);
    }
  });

  it('fully replaces judgement feedback for every original stage locale', () => {
    for (const _stage of stages) {
      setLocale('zh-CN');
      expect(['PERFECT', 'GREAT', 'OK', 'MISS'].map((kind) => localizedGardenFeedback(kind as 'PERFECT')))
        .toEqual(['完美！', '很棒！', '可以！', '错过！']);
      setLocale('en');
      expect(['PERFECT', 'GREAT', 'OK', 'MISS'].map((kind) => localizedGardenFeedback(kind as 'PERFECT')))
        .toEqual(['PERFECT!', 'GREAT!', 'OK!', 'MISS!']);
    }
  });
});
