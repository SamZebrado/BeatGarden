import { afterEach, describe, expect, it } from 'vitest';
import { BubbleKitchenStage, CloudPostStage, SleepyGreenhouseStage, classifyGardenUnmatched, laneFromSurfaceX, localizedGardenFeedback, nearestUnconsumedGardenTarget, updateGardenPointerPreview } from '../src/stages/original/GardenStages';
import { setLocale } from '../src/i18n/strings';
import { FireflyDockStage } from '../src/stages/fireflyDock/FireflyDockStage';

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

  it('requires four successful tutorial steps before formal play for every built-in stage', () => {
    const allStages = [new FireflyDockStage(), ...stages];
    for (const stage of allStages) {
      const steps = stage.buildTutorialSteps?.() ?? [];
      expect(steps).toHaveLength(4);
      expect(new Set(steps.map((step) => step.id)).size).toBe(4);
      expect(steps.every((step) => step.targets.length > 0)).toBe(true);
      expect(steps.flatMap((step) => step.targets).every((target) => target.id.startsWith('tutorial-'))).toBe(true);
    }
  });

  it('teaches lane taps, directional swipes, and paired hold release explicitly', () => {
    const bubble = new BubbleKitchenStage().buildTutorialSteps!();
    expect(bubble.map((step) => (step.targets[0]!.meta as { lane: number }).lane)).toEqual([0, 1, 2, 1]);
    const cloud = new CloudPostStage().buildTutorialSteps!();
    expect(cloud.map((step) => step.targets[0]!.inputKind)).toEqual(['swipeLeft', 'swipeRight', 'swipeLeft', 'swipeRight']);
    const greenhouse = new SleepyGreenhouseStage().buildTutorialSteps!();
    for (const step of greenhouse) {
      expect(step.targets.map((target) => target.inputKind)).toEqual(['holdStart', 'holdRelease']);
      expect(step.targets[0]!.pairedId).toBe(step.targets[1]!.id);
    }
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

  it('separates wrong lane/direction from correct controls at the wrong time', () => {
    const tap = { type: 'tap' as const, x: 500, y: 300, surfaceWidth: 900, surfaceHeight: 600, audioTime: 1, domTimeMs: 1 };
    const tapTarget = { type: 'judge-target' as const, id: 'tap', beat: 4, inputKind: 'tap' as const, meta: { lane: 1 } };
    expect(classifyGardenUnmatched('laneTap', tap, tapTarget, -.4, .15)).toBe('TOO_EARLY');
    expect(classifyGardenUnmatched('laneTap', tap, tapTarget, .4, .15)).toBe('TOO_LATE');
    expect(classifyGardenUnmatched('laneTap', { ...tap, x: 50 }, tapTarget, 0, .15)).toBe('WRONG_LANE');

    const swipe = { type: 'swipe' as const, direction: 'left' as const, x: 450, y: 300, surfaceWidth: 900, surfaceHeight: 600, dx: -200, dy: 0, audioTime: 1, domTimeMs: 1 };
    const swipeTarget = { type: 'judge-target' as const, id: 'swipe', beat: 4, inputKind: 'swipeLeft' as const, meta: { lane: 1, direction: 'left' as const } };
    expect(classifyGardenUnmatched('swipe', swipe, swipeTarget, -.4, .15)).toBe('TOO_EARLY');
    expect(classifyGardenUnmatched('swipe', swipe, swipeTarget, .4, .15)).toBe('TOO_LATE');
    expect(classifyGardenUnmatched('swipe', { ...swipe, direction: 'right' }, swipeTarget, 0, .15)).toBe('WRONG_DIRECTION');
  });

  it('distinguishes early and late greenhouse release', () => {
    const release = { type: 'holdEnd' as const, pointerId: 1, x: 450, y: 300, surfaceWidth: 900, surfaceHeight: 600, audioTime: 1, domTimeMs: 1 };
    const target = { type: 'judge-target' as const, id: 'release', beat: 6, inputKind: 'holdRelease' as const, meta: { lane: 1, role: 'release' as const } };
    expect(classifyGardenUnmatched('hold', release, target, -.4, .15)).toBe('HOLD_EARLY');
    expect(classifyGardenUnmatched('hold', release, target, .4, .15)).toBe('HOLD_LATE');
  });

  it('clears completed Cloud pointer previews so release guidance cannot persist', () => {
    const down = { type: 'down' as const, x: 700, y: 300, surfaceWidth: 900, surfaceHeight: 600 };
    const active = updateGardenPointerPreview('swipe', null, down);
    expect(active?.down).toBe(true);
    const moved = updateGardenPointerPreview('swipe', active, { ...down, type: 'move', x: 300 });
    expect(updateGardenPointerPreview('swipe', moved, { ...down, type: 'up', x: 300 })).toBeNull();
    expect(updateGardenPointerPreview('swipe', active, { ...down, type: 'cancel' })).toBeNull();
  });

  it('never derives Cloud or Bubble early feedback from a consumed prior target', () => {
    const cloudAction = { type: 'swipe' as const, direction: 'left' as const, x: 450, y: 300, surfaceWidth: 900, surfaceHeight: 600, dx: -200, dy: 0, audioTime: 3.05, domTimeMs: 1 };
    const cloudTargets = [
      { type: 'judge-target' as const, id: 'cloud-done', beat: 6, inputKind: 'swipeRight' as const, meta: { direction: 'right' as const } },
      { type: 'judge-target' as const, id: 'cloud-next', beat: 8, inputKind: 'swipeLeft' as const, meta: { direction: 'left' as const } },
    ];
    const cloudExpected = nearestUnconsumedGardenTarget('swipe', cloudAction, cloudTargets, new Set(['cloud-done']), (beat) => beat / 2);
    expect(cloudExpected?.id).toBe('cloud-next');
    expect(classifyGardenUnmatched('swipe', cloudAction, cloudExpected, cloudAction.audioTime - 4, .13)).toBe('TOO_EARLY');

    const bubbleAction = { type: 'tap' as const, x: 450, y: 300, surfaceWidth: 900, surfaceHeight: 600, audioTime: 3.05, domTimeMs: 1 };
    const bubbleTargets = [
      { type: 'judge-target' as const, id: 'bubble-done', beat: 6, inputKind: 'tap' as const, meta: { lane: 0 } },
      { type: 'judge-target' as const, id: 'bubble-next', beat: 8, inputKind: 'tap' as const, meta: { lane: 1 } },
    ];
    const bubbleExpected = nearestUnconsumedGardenTarget('laneTap', bubbleAction, bubbleTargets, new Set(['bubble-done']), (beat) => beat / 2);
    expect(bubbleExpected?.id).toBe('bubble-next');
    expect(classifyGardenUnmatched('laneTap', bubbleAction, bubbleExpected, bubbleAction.audioTime - 4, .13)).toBe('TOO_EARLY');
  });
});
