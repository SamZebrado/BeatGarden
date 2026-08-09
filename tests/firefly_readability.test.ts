import { afterEach, describe, expect, it } from 'vitest';
import { getLocale, setLocale, t } from '../src/i18n/strings';
import { FireflyDockStage } from '../src/stages/fireflyDock/FireflyDockStage';
import type { ScheduledJudgeTarget } from '../src/timing/Scheduler';

describe('Firefly Dock first-player readability contract', () => {
  afterEach(() => setLocale('zh-CN'));

  it('uses four guided targets on beats 2, 4, 6, and 8', () => {
    const events = new FireflyDockStage().buildEvents();
    const targets = events
      .filter((event) => event.type === 'judge-target')
      .slice(0, 4)
      .map((event) => event.beat);
    expect(targets).toEqual([2, 4, 6, 8]);
  });

  it('gives every guided target a two-beat approaching cue', () => {
    const events = new FireflyDockStage().buildEvents();
    const targetBeats = events
      .filter((event) => event.type === 'judge-target')
      .slice(0, 4)
      .map((event) => event.beat);
    const approachBeats = events
      .filter((event) => event.type === 'cue' && event.name === 'seed-approach')
      .slice(0, 4)
      .map((event) => event.beat);
    expect(approachBeats).toEqual(targetBeats.map((beat) => beat - 2));
  });

  it('defaults to Simplified Chinese and English replaces the full instruction', () => {
    setLocale('zh-CN');
    expect(getLocale()).toBe('zh-CN');
    expect(t('input.howTo')).toContain('鼠标左键');
    expect(t('tutorial.action')).toContain('触摸');

    setLocale('en');
    expect(getLocale()).toBe('en');
    expect(t('input.howTo')).toContain('left mouse button');
    expect(t('tutorial.action')).toContain('Click or touch');
  });

  it('localizes every immediate timing judgement', () => {
    setLocale('zh-CN');
    expect([
      t('feedback.PERFECT'),
      t('feedback.GREAT'),
      t('feedback.OK'),
      t('feedback.MISS'),
    ]).toEqual(['完美！', '很棒！', '可以！', '错过！']);
  });

  it('auto-MISS never moves the player-operated lever', () => {
    const stage = new FireflyDockStage();
    const internals = stage as unknown as {
      services: { transport: { snapshot: () => { audioTime: number } } };
      workerActionT0: number | null;
    };
    internals.services = { transport: { snapshot: () => ({ audioTime: 12.5 }) } };
    const target = { type: 'judge-target', id: 'auto-miss', beat: 2, inputKind: 'tap' } as ScheduledJudgeTarget;
    stage.onJudge({ kind: 'MISS', deltaMs: 140, automatic: true }, target);
    expect(internals.workerActionT0).toBeNull();
    stage.onJudge({ kind: 'MISS', deltaMs: 140 }, target);
    expect(internals.workerActionT0).toBe(12.5);
  });
});
