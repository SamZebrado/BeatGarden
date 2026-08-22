import { describe, expect, it } from 'vitest';
import { PhdSystems, evaluateMentor, resourceModifiers, type MentorVector } from '../src/running/core/phdSystems';

describe('PhD systems', () => {
  it('keeps Signal and Noise independent for multidimensional mentors', () => {
    const base: MentorVector = { expertise: 0.9, resources: 0.7, clarity: 0.8, projectMatch: 0.9, autonomySupport: 0.3, emotionalSafety: 0.25, boundaryRespect: 0.3, stability: 0.5 };
    const player = { logic: 30, clarity: 30, boundary: 20, purpose: 20, connection: 20, evidence: 20 };
    const harmfulExpert = evaluateMentor(base, player);
    const safeExpert = evaluateMentor({ ...base, autonomySupport: 0.9, emotionalSafety: 0.95, boundaryRespect: 0.95, stability: 0.9 }, player);
    expect(harmfulExpert.signal).toBe(safeExpert.signal);
    expect(harmfulExpert.noise).toBeGreaterThan(safeExpert.noise);
    expect(harmfulExpert.signal).toBeGreaterThan(0);
  });

  it('applies distinct project costs and rewards while bounding resources', () => {
    const system = new PhdSystems();
    system.step(12, 1 / 60);
    expect(system.snapshot().choice?.kind).toBe('project');
    expect(system.choose('replication', 12)).toBe(true);
    const started = system.snapshot();
    expect(started.energy).toBe(84);
    expect(started.focus).toBe(88);
    expect(started.calendarLoad).toBeCloseTo(20, 2);
    for (let index = 0; index < 20; index += 1) system.onDefeated();
    const completed = system.snapshot();
    expect(completed.completedProjects).toBe(1);
    expect(completed.logic).toBe(28);
    expect(completed.evidence).toBe(21);
    expect(completed.thesisStage).toBe('sapling');
  });

  it('turns recurring meetings into both useful feedback and pollution', () => {
    const system = new PhdSystems();
    system.startReviewChoice('supervisor');
    system.choose('supportive', 0);
    system.onMeeting();
    const state = system.snapshot();
    expect(state.signal).toBeGreaterThan(0);
    expect(state.noise).toBeGreaterThan(0);
    expect(state.pollution).toBeGreaterThan(0);
    expect(state.spirit).toBeLessThan(100);
  });

  it('models phone interruptions as Calendar/Noise costs without fake XP rewards', () => {
    const system = new PhdSystems();
    system.onInterruption();
    const state = system.snapshot();
    expect(state.calendarLoad).toBeGreaterThan(8);
    expect(state.noise).toBeGreaterThan(0);
    expect(state.pollution).toBeGreaterThan(0);
    expect(state.completedProjects).toBe(0);
  });

  it('keeps every front-facing resource bounded under repeated harmful events', () => {
    const system = new PhdSystems();
    system.startReviewChoice('supervisor');
    system.choose('controlling', 0);
    for (let index = 0; index < 100; index += 1) {
      system.onMeeting();
      system.onInterruption();
    }
    const state = system.snapshot();
    for (const value of [state.energy, state.focus, state.spirit, state.calendarLoad, state.signal, state.noise, state.pollution]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('produces no supervisor feedback before a supervisor is selected', () => {
    const system = new PhdSystems();
    const before = system.snapshot();
    system.onMeeting();
    const after = system.snapshot();
    expect(after.supervisorId).toBeNull();
    expect(after.supervisorFeedback).toBeNull();
    expect(after.signal).toBe(before.signal);
    expect(after.noise).toBe(before.noise);
    expect(after.pollution).toBe(before.pollution);
  });

  it('makes low Energy, Focus, and Spirit produce distinct felt gameplay penalties', () => {
    const full = resourceModifiers({ energy: 100, focus: 100, spirit: 100 });
    const empty = resourceModifiers({ energy: 0, focus: 0, spirit: 0 });
    expect(empty.moveSpeed).toBeLessThan(full.moveSpeed);
    expect(empty.shotCadence).toBeGreaterThan(full.shotCadence);
    expect(empty.projectileDamage).toBeLessThan(full.projectileDamage);
    expect(empty.projectEfficiency).toBeLessThan(full.projectEfficiency);
    expect(empty.orbitDamage).toBeLessThan(full.orbitDamage);
    expect(empty.pickupRadius).toBeLessThan(full.pickupRadius);
    expect(empty.healthRecovery).toBeLessThan(full.healthRecovery);
  });

  it('allows an explicit project overdraft but converts it into Calendar, pollution, and Spirit consequences', () => {
    const system = new PhdSystems({ initialResources: { energy: 2, focus: 1, spirit: 40 } });
    system.step(12, 1 / 60);
    expect(system.choose('prestige', 12)).toBe(true);
    const state = system.snapshot();
    expect(state.energy).toBe(0);
    expect(state.focus).toBe(0);
    expect(state.calendarLoad).toBeGreaterThan(50);
    expect(state.pollution).toBeGreaterThan(0);
    expect(state.spirit).toBeLessThan(40);
  });

  it('counts only milestone-tagged defeats toward an active arena', () => {
    const system = new PhdSystems();
    system.startReviewMilestone('qualifying');
    system.step(4, 3.1);
    system.step(7, 2.6);
    system.onDefeated(4, false);
    expect(system.snapshot().milestone?.progress).toBe(0);
    system.onDefeated(2, true);
    expect(system.snapshot().milestone?.progress).toBe(2);
  });

  it('advances the compressed calendar and annual-review schedule deterministically', () => {
    const system = new PhdSystems();
    system.step(45, 1 / 60);
    expect(system.snapshot().year).toBe(2);
    expect(system.snapshot().annualReviews).toBe(1);
    expect(system.snapshot().choice?.kind).toBe('supervisor');
    expect(system.choose('supportive', 45)).toBe(true);
    system.step(45.1, 1 / 60);
    expect(system.choose('replication', 45.1)).toBe(true);
    system.step(225, 1 / 60);
    expect(system.snapshot().year).toBe(6);
    expect(system.snapshot().annualReviews).toBe(2);
    expect(system.snapshot().evidence).toBe(15);
  });

  it('emits a bounded world-season pulse when a new year begins', () => {
    const system = new PhdSystems();
    system.step(45, 1 / 60);
    expect(system.snapshot().seasonPulse).toBeGreaterThan(3.9);
    expect(system.choose('supportive', 45)).toBe(true);
    system.step(45.1, 1 / 60);
    expect(system.choose('replication', 45.1)).toBe(true);
    system.step(46, 1);
    expect(system.snapshot().seasonPulse).toBeLessThan(3.1);
    expect(system.snapshot().seasonPulse).toBeGreaterThanOrEqual(0);
  });

  it('builds four distinct Thesis review stages from contribution diversity', () => {
    const system = new PhdSystems();
    for (const stage of ['seed', 'sapling', 'tree', 'bloom'] as const) {
      system.startReviewThesisStage(stage);
      expect(system.snapshot().thesisStage).toBe(stage);
    }
  });

  it('uses distinct annual milestones, voluntary pre-defense, revisions, and a final Defense', () => {
    const system = new PhdSystems();
    finishProject(system, 12, 'riskyIdea');
    finishProject(system, 31, 'helping');
    system.step(45, 1 / 60);
    expect(system.snapshot().year).toBe(2);
    expect(system.snapshot().annualMilestone?.kind).toBe('firstYearTalk');
    expect(system.snapshot().choice?.kind).toBe('supervisor');
    expect(system.choose('supportive', 45)).toBe(true);
    for (let index = 0; index < 5; index += 1) system.onMeeting();
    system.step(90, 1 / 60);
    expect(system.snapshot().year).toBe(3);
    expect(system.snapshot().annualMilestone?.kind).toBe('proposal');
    expect(system.snapshot().choice?.kind).toBe('lifestyle');
    expect(system.choose('rest', 90)).toBe(true);
    system.step(90.1, 1 / 60);
    expect(system.snapshot().choice?.kind).toBe('project');
    expect(system.choose('replication', 90.1)).toBe(true);
    for (let index = 0; index < 20; index += 1) system.onDefeated();
    system.step(135, 1 / 60);
    expect(system.snapshot().year).toBe(4);
    expect(system.snapshot().annualMilestone).toBeNull();
    expect(system.snapshot().choice?.kind).toBe('qualifying');
    expect(system.choose('attempt', 135)).toBe(true);
    expect(system.snapshot().qualifying).toBe('ready');
    expect(system.snapshot().milestone?.phase).toBe('preparation');
    system.step(136, 3.1);
    expect(system.snapshot().milestone?.phase).toBe('rehearsal');
    system.step(139, 2.6);
    expect(system.snapshot().milestone?.phase).toBe('presentation');
    system.step(175, 40);
    expect(system.snapshot().milestone?.phase).toBe('presentation');
    expect(system.snapshot().year).toBe(4);
    const qualifyingTarget = system.snapshot().milestone!.target;
    system.onDefeated(qualifyingTarget, true);
    expect(system.snapshot().thesisStage).toBe('bloom');
    expect(system.snapshot().qualifying).toBe('passed');
    expect(system.snapshot().preDefense).toBe('ready');
    system.step(197, 1 / 60);
    expect(system.snapshot().choice?.kind).toBe('preDefense');
    expect(system.choose('attempt', 197)).toBe(true);
    expect(system.snapshot().revisionRemaining).toBe(12);
    expect(system.snapshot().milestone).toBeNull();
    system.step(210, 13);
    expect(system.snapshot().choice?.kind).toBe('defense');
    expect(system.choose('attempt', 210)).toBe(true);
    system.step(215, 4.1);
    system.step(218, 2.6);
    for (let index = 0; index < 30; index += 1) system.onDefeated();
    expect(system.snapshot().defense).toBe('passed');
    expect(system.snapshot().graduated).toBe(true);
    expect(system.snapshot().terminal).toBe('graduated');
  });

  it('presents the single Qualifying Exam at the Year-4 boundary even with fewer than two completed projects', () => {
    const system = new PhdSystems();
    system.step(12, 1 / 60);
    expect(system.choose('prestige', 12)).toBe(true);
    expect(system.snapshot().completedProjects).toBe(0);
    system.step(45, 1 / 60);
    expect(system.choose('handsOff', 45)).toBe(true);
    system.step(90, 45);
    if (system.snapshot().choice?.kind === 'lifestyle') expect(system.choose('mindfulness', 90)).toBe(true);
    system.step(135, 45);
    expect(system.snapshot().year).toBe(4);
    expect(system.snapshot().completedProjects).toBe(0);
    expect(system.snapshot().annualMilestone).toBeNull();
    expect(system.snapshot().qualifying).toBe('ready');
    expect(system.snapshot().choice?.kind).toBe('qualifying');
  });

  it('offers exactly three stable supervisor archetypes with observably different consequences', () => {
    const outcomes = (['supportive', 'controlling', 'handsOff'] as const).map((id) => {
      const system = new PhdSystems();
      system.startReviewAnnualMilestone(1);
      expect(system.snapshot().choice?.options).toEqual(['supportive', 'controlling', 'handsOff']);
      expect(system.choose(id, 45)).toBe(true);
      system.onMeeting();
      system.onInterruption();
      return system.snapshot();
    });
    expect(outcomes.map((state) => state.supervisorId)).toEqual(['supportive', 'controlling', 'handsOff']);
    expect(outcomes[1].calendarLoad).toBeGreaterThan(outcomes[0].calendarLoad);
    expect(outcomes[1].pollution).toBeGreaterThan(outcomes[2].pollution);
    expect(outcomes[0].signal).toBeGreaterThan(outcomes[2].signal);
  });

  it('keeps one deterministic bounded lifestyle tendency with real opposing effects', () => {
    const system = new PhdSystems({ initialResources: { energy: 70, focus: 70, spirit: 70 } });
    system.startReviewAnnualMilestone(1);
    system.choose('supportive', 45);
    system.step(70, 1 / 60);
    expect(system.snapshot().choice?.kind).toBe('lifestyle');
    expect(system.snapshot().choice?.options).toEqual(['rest', 'exercise', 'social', 'mindfulness', 'weekendOvertime']);
    const before = system.snapshot();
    expect(system.choose('weekendOvertime', 70)).toBe(true);
    const chosen = system.snapshot();
    expect(chosen.lifestyle?.id).toBe('weekendOvertime');
    expect(chosen.evidence).toBeGreaterThan(before.evidence);
    expect(chosen.energy).toBeLessThan(before.energy);
    expect(chosen.calendarLoad).toBeGreaterThan(before.calendarLoad);
  });

  it('turns Year Nine into a bounded final year instead of an infinite capped label', () => {
    const system = new PhdSystems();
    system.startReviewYear(9, false);
    expect(system.snapshot().terminal).toBe('finalYear');
    system.step(405, 1 / 60);
    const ended = system.snapshot();
    expect(ended.year).toBe(9);
    expect(ended.terminal).toBe('ended');
    expect(ended.calendarLoad).toBe(100);
    system.step(900, 1 / 60);
    expect(system.snapshot()).toEqual(ended);
  });
});

function finishProject(system: PhdSystems, time: number, id: 'replication' | 'riskyIdea' | 'helping' | 'prestige'): void {
  system.step(time, 1 / 60);
  expect(system.snapshot().choice?.kind).toBe('project');
  expect(system.choose(id, time)).toBe(true);
  for (let index = 0; index < 20; index += 1) system.onDefeated();
}
