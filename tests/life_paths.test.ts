import { describe, expect, it } from 'vitest';
import { WORK_OFFERS, effectiveWorkOffer } from '../src/running/core/lifePaths';
import { adaptAcademicPerson } from '../src/running/core/people';
import { PhdSystems, evaluateMentor, mentorVectorFor } from '../src/running/core/phdSystems';
import { ScenarioSimulation } from '../src/running/core/scenarioSimulation';

function advance(simulation: ScenarioSimulation, seconds: number, stopAt?: string): void {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    const choice = simulation.snapshot().choice;
    if (choice) {
      if (choice.kind === stopAt) return;
      simulation.choose(choice.options[0]);
    }
    const angle = frame / 120;
    simulation.step(1 / 60, { x: Math.cos(angle), y: Math.sin(angle) });
  }
}

describe('shared Person and life-path authority', () => {
  it('adapts the same academic Person differently for PhD and Master roles', () => {
    const phd = adaptAcademicPerson('rowan', 'phd-supervisor');
    const master = adaptAcademicPerson('rowan', 'master-supervisor');
    expect(phd.personId).toBe(master.personId);
    expect(phd.signal).toBe(master.signal);
    expect(phd.assignmentPressure).toBeGreaterThan(master.assignmentPressure);
    expect(phd.independentResearchSupport).not.toBe(master.independentResearchSupport);
  });

  it('separates short-term assigned labor from independent PhD progress and models boundaries', () => {
    const accepted = new PhdSystems();
    accepted.startReviewChoice('supervisor');
    accepted.choose('controlling', 0);
    accepted.onMeeting();
    accepted.onMeeting();
    expect(accepted.snapshot().choice?.kind).toBe('supervisorRequest');
    accepted.choose('accept', 1);
    expect(accepted.snapshot().assignedLabor).toBeGreaterThan(0);
    expect(accepted.snapshot().independentResearch).toBe(0);
    expect(accepted.snapshot().evidence).toBeGreaterThan(12);
    accepted.startReviewProgression('thesis');
    expect(accepted.snapshot().preDefense).toBe('hidden');

    const bounded = new PhdSystems();
    bounded.startReviewChoice('supervisor');
    bounded.choose('controlling', 0);
    bounded.onMeeting();
    bounded.onMeeting();
    bounded.choose('setBoundary', 1);
    expect(bounded.snapshot().assignedLabor).toBe(0);
    expect(bounded.snapshot().independentResearch).toBeGreaterThan(accepted.snapshot().independentResearch);
    expect(bounded.snapshot().boundary).toBeGreaterThan(20);
    expect(bounded.snapshot().lastBoundaryReaction).toBe('strained');
  });

  it('derives PhD feedback, requests, boundaries and milestone stance from one Person ID', () => {
    const system = new PhdSystems();
    system.startReviewChoice('supervisor');
    system.choose('controlling', 0);
    const before = system.snapshot();
    const expected = evaluateMentor(mentorVectorFor('rowan'), before);
    system.onMeeting();
    expect(system.snapshot().supervisorPersonId).toBe('rowan');
    expect(system.snapshot().supervisorFeedback).toMatchObject(expected);
    system.onMeeting();
    expect(system.snapshot().choice?.kind).toBe('supervisorRequest');
    system.choose('setBoundary', 1);
    expect(system.snapshot().lastBoundaryReaction).toBe('strained');
    system.startReviewMilestone('qualifying');
    expect(system.snapshot().milestone?.stance).toBe('adversarial');
  });

  it('runs the Master Year-2 Proposal as one finite six-target roster, then offers exactly three career plans', () => {
    const simulation = new ScenarioSimulation('master', 81, 'garden', { automaticOffense: false, damageEnabled: false });
    simulation.choose('rowan');
    advance(simulation, 63);
    const proposal = simulation.snapshot();
    expect(proposal.masterPath?.year).toBe(3);
    expect(proposal.masterPath?.proposal.phase).toBe('presentation');
    expect(proposal.enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(6);
    const designated = proposal.enemies.filter((enemy) => enemy.source === 'milestone');
    simulation.defeatDesignatedTargetForReview(designated[0]!.id);
    advance(simulation, 3);
    expect(simulation.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(5);
    for (const enemy of simulation.snapshot().enemies.filter((item) => item.source === 'milestone')) simulation.defeatDesignatedTargetForReview(enemy.id);
    simulation.step(1 / 60, { x: 0, y: 0 });
    expect(simulation.snapshot().choice).toEqual({ kind: 'careerPlan', options: ['researchPhd', 'employment', 'undecided'] });
  });

  it('keeps a deliberately unresolved Master Proposal isolated from events and Defense', () => {
    const simulation = new ScenarioSimulation('master', 82, 'garden', { automaticOffense: false, damageEnabled: false });
    simulation.choose('mei');
    advance(simulation, 105);
    const state = simulation.snapshot();
    expect(state.masterPath?.proposal.phase).toBe('presentation');
    expect(state.masterPath?.proposal.progress).toBe(0);
    expect(state.enemies).toHaveLength(6);
    expect(state.enemies.every((enemy) => enemy.source === 'milestone')).toBe(true);
    expect(state.event.phase).toBe('idle');
    expect(state.climax.phase).toBe('none');
  });

  it('keeps ordinary Work defeats out of conversion and promotion authority', () => {
    const quiet = new ScenarioSimulation('work', 93, 'garden', { automaticOffense: false, damageEnabled: false });
    const farmed = new ScenarioSimulation('work', 93, 'garden', { automaticOffense: false, damageEnabled: false });
    quiet.startWorkPathReview('trial', .5);
    farmed.startWorkPathReview('trial', .5);
    farmed.recordOrdinaryDefeatsForReview(100);
    quiet.step(1 / 60, { x: 0, y: 0 });
    farmed.step(1 / 60, { x: 0, y: 0 });
    expect(farmed.snapshot().defeated).toBeGreaterThan(quiet.snapshot().defeated);
    expect(farmed.snapshot().progress).toBe(quiet.snapshot().progress);
    expect(farmed.snapshot().workPath?.conversionScore).toBe(quiet.snapshot().workPath?.conversionScore);
    expect(farmed.snapshot().workPath?.promotionProgress).toBe(0);
  });

  it('does not launch Delivery or award promotion credit before employment', () => {
    const simulation = new ScenarioSimulation('work', 94, 'garden', { automaticOffense: false, damageEnabled: false });
    simulation.startWorkPathReview('trial', .5);
    simulation.startReview('climax');
    expect(simulation.snapshot().climax.phase).toBe('none');
    expect(simulation.snapshot().enemies.some((enemy) => enemy.kind === 'delivery')).toBe(false);
    expect(simulation.snapshot().workPath?.promotionProgress).toBe(0);
  });

  it('models three partial-info Work offers, trial, conversion choice and explicit switching costs', () => {
    const simulation = new ScenarioSimulation('work', 92, 'garden', { damageEnabled: false });
    expect(simulation.snapshot().choice).toEqual({ kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] });
    simulation.choose('offer-b');
    expect(simulation.snapshot().workPath?.stage).toBe('trial');
    expect(simulation.snapshot().workPath?.managerId).toBe('opaque-driver');
    const initialMarket = simulation.snapshot().workPath!.marketStrength;
    advance(simulation, 40, 'workConversion');
    const trial = simulation.snapshot();
    expect(trial.choice?.kind).toBe('workConversion');
    expect(trial.workPath!.experience).toBeGreaterThan(0);
    expect(trial.workPath!.marketStrength).not.toBe(initialMarket);
    const before = { energy: trial.energy, spirit: trial.spirit, calendar: trial.calendar, careerTime: trial.workPath!.careerTime };
    simulation.choose('leaveSearch');
    const switched = simulation.snapshot();
    expect(switched.choice?.kind).toBe('workOffer');
    expect(switched.workPath!.careerTime).toBeGreaterThan(before.careerTime);
    expect(switched.energy).toBeLessThan(before.energy);
    expect(switched.spirit).toBeLessThan(before.spirit);
    expect(switched.calendar).toBeGreaterThan(before.calendar);
  });

  it('keeps exactly three initial Work offers while market and Experience alter real trial terms', () => {
    const baseOffer = WORK_OFFERS[0]!;
    const weakNewcomer = effectiveWorkOffer(baseOffer, .2, 0);
    const strongExperienced = effectiveWorkOffer(baseOffer, .8, 100);
    expect(weakNewcomer.pressure).toBeGreaterThan(strongExperienced.pressure);
    expect(weakNewcomer.opportunity).toBeLessThan(strongExperienced.opportunity);
    const weakMarket = new ScenarioSimulation('work', 31, 'garden', { damageEnabled: false });
    const strongMarket = new ScenarioSimulation('work', 31, 'garden', { damageEnabled: false });
    weakMarket.startWorkPathReview('offers', .2);
    strongMarket.startWorkPathReview('offers', .8);
    expect(weakMarket.snapshot().choice).toEqual({ kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] });
    expect(strongMarket.snapshot().choice).toEqual({ kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] });
    weakMarket.choose('offer-a');
    strongMarket.choose('offer-a');
    expect(weakMarket.snapshot().calendar).toBeGreaterThan(strongMarket.snapshot().calendar);
    expect(weakMarket.snapshot().focus).toBeLessThan(strongMarket.snapshot().focus);
  });
});
