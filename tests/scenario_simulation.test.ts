import { describe, expect, it } from 'vitest';
import { ScenarioSimulation } from '../src/running/core/scenarioSimulation';

function run(simulation: ScenarioSimulation, seconds: number): void {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    const state = simulation.snapshot();
    if (state.choice) simulation.choose(state.choice.options[0]);
    const angle = frame / 100;
    simulation.step(1 / 60, { x: Math.cos(angle), y: Math.sin(angle) });
  }
}

function runUntilChoice(simulation: ScenarioSimulation, seconds: number): void {
  for (let frame = 0; frame < seconds * 60 && !simulation.snapshot().choice; frame += 1) {
    simulation.step(1 / 60, { x: 0, y: 0 });
  }
}

describe('Master and Work scenario strategies', () => {
  it('remain deterministic for identical worlds, seeds, and input streams', () => {
    for (const world of ['master', 'work'] as const) {
      const first = new ScenarioSimulation(world, 44);
      const second = new ScenarioSimulation(world, 44);
      run(first, 18);
      run(second, 18);
      expect(first.snapshot()).toEqual(second.snapshot());
    }
  });

  it('applies bounded difficulty profiles without changing world identity', () => {
    const sprout = new ScenarioSimulation('work', 44, 'sprout');
    const storm = new ScenarioSimulation('work', 44, 'storm');
    run(sprout, 4);
    run(storm, 4);
    expect(storm.snapshot().enemies.length + storm.snapshot().defeated).toBeGreaterThan(sprout.snapshot().enemies.length + sprout.snapshot().defeated);
    expect(storm.snapshot().world).toBe('work');
  });

  it('gives Master a compressed track choice with real resource trade-offs', () => {
    const simulation = new ScenarioSimulation('master', 1);
    expect(simulation.snapshot().choice?.kind).toBe('masterSupervisor');
    expect(simulation.choose('mei')).toBe(true);
    runUntilChoice(simulation, 7.1);
    const before = simulation.snapshot();
    expect(before.choice?.kind).toBe('masterTrack');
    expect(simulation.choose('jobSearch')).toBe(true);
    const after = simulation.snapshot();
    expect(after.progress).toBeGreaterThan(before.progress);
    expect(after.energy).toBeLessThan(before.energy);
    expect(after.calendar).toBeGreaterThan(before.calendar);
  });

  it('makes Work priority shifts alter progress and spawn rush pressure', () => {
    const simulation = new ScenarioSimulation('work', 2);
    expect(simulation.snapshot().choice?.kind).toBe('workOffer');
    expect(simulation.snapshot().choice?.options).toEqual(['offer-a', 'offer-b', 'offer-c']);
    expect(simulation.choose('offer-a')).toBe(true);
    runUntilChoice(simulation, 5.1);
    const before = simulation.snapshot();
    expect(before.choice?.kind).toBe('workPriority');
    expect(simulation.choose('acceptRush')).toBe(true);
    const state = simulation.snapshot();
    expect(state.activePriority).toBe('⚡');
    expect(state.progress - before.progress).toBe(15);
    expect(state.enemies.filter((enemy) => enemy.source === 'periodic')).toHaveLength(4);
  });

  it('makes the full 13-second Rush window keep draining resources without restoring farming progress', () => {
    const simulation = new ScenarioSimulation('work', 12);
    const protectedRun = new ScenarioSimulation('work', 12);
    simulation.choose('offer-a');
    protectedRun.choose('offer-a');
    runUntilChoice(simulation, 5.1);
    runUntilChoice(protectedRun, 5.1);
    expect(simulation.choose('acceptRush')).toBe(true);
    expect(protectedRun.choose('protectFocus')).toBe(true);
    const start = simulation.snapshot();
    const protectedStart = protectedRun.snapshot();
    run(simulation, 4);
    run(protectedRun, 4);
    const active = simulation.snapshot();
    const protectedActive = protectedRun.snapshot();
    expect(active.priorityRemaining).toBeGreaterThan(8.8);
    expect(active.priorityRemaining).toBeLessThan(9.2);
    expect(active.energy - start.energy).toBeLessThan(protectedActive.energy - protectedStart.energy);
    expect(active.focus - start.focus).toBeLessThan(protectedActive.focus - protectedStart.focus);
    expect(active.calendar - start.calendar).toBeGreaterThan(protectedActive.calendar - protectedStart.calendar);
    expect(active.progress).toBe(start.progress);
  });

  it('separates harassment handling from Work portfolio growth and gives Protect Focus an ongoing benefit', () => {
    const rush = new ScenarioSimulation('work', 22);
    const protectedRun = new ScenarioSimulation('work', 22);
    rush.choose('offer-a');
    protectedRun.choose('offer-a');
    runUntilChoice(rush, 5.1);
    runUntilChoice(protectedRun, 5.1);
    rush.choose('acceptRush');
    protectedRun.choose('protectFocus');
    const protectedStart = protectedRun.snapshot();
    run(rush, 4);
    run(protectedRun, 4);
    const rushed = rush.snapshot();
    const protectedState = protectedRun.snapshot();
    expect(rushed.defeated).toBeGreaterThan(0);
    expect(rushed.progress).toBe(15);
    expect(rushed.orbitCount).toBe(1);
    expect(protectedState.focus).toBeGreaterThan(rushed.focus);
    expect(protectedState.calendar).toBeLessThan(rushed.calendar);
    expect(protectedState.progress).toBeGreaterThan(protectedStart.progress);
    expect(protectedState.priorityRemaining).toBeGreaterThan(0);
  });

  it('uses visibly different first periodic events for Master and Work', () => {
    const master = new ScenarioSimulation('master', 3);
    const work = new ScenarioSimulation('work', 3);
    master.startReview('event');
    work.startReview('event');
    expect(master.snapshot().event.kind).toBe('termRush');
    expect(work.snapshot().event.kind).toBe('daily');
    run(master, 2.2);
    run(work, 2.2);
    expect(master.snapshot().enemies.filter((enemy) => enemy.source === 'periodic').length).toBeGreaterThanOrEqual(8);
    expect(work.snapshot().enemies.filter((enemy) => enemy.source === 'periodic').length).toBeGreaterThanOrEqual(4);
  });

  it('provides finite Master Defense targets while Work Delivery contributes without becoming promotion', () => {
    const master = new ScenarioSimulation('master', 5, 'garden', { automaticOffense: false, damageEnabled: false });
    master.startMasterPathReview(3, 'undecided');
    master.startReview('climax');
    run(master, 3.2);
    expect(master.snapshot().climax.phase).toBe('active');
    expect(master.snapshot().enemies.filter((enemy) => enemy.source === 'climax')).toHaveLength(5);

    const work = new ScenarioSimulation('work', 5);
    work.startWorkPathReview('employed', .5);
    work.startReview('climax');
    run(work, 3.2);
    expect(work.snapshot().enemies.some((enemy) => enemy.kind === 'delivery' && enemy.source === 'climax')).toBe(true);
    run(work, 14);
    expect(work.snapshot().workPath?.promotionProgress).toBeGreaterThan(0);
    expect(work.snapshot().completed).toBe(false);
  });
});
