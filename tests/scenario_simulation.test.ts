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
    runUntilChoice(simulation, 5.1);
    const before = simulation.snapshot();
    expect(before.choice?.kind).toBe('workPriority');
    expect(simulation.choose('acceptRush')).toBe(true);
    const state = simulation.snapshot();
    expect(state.activePriority).toBe('⚡');
    expect(state.progress - before.progress).toBe(15);
    expect(state.enemies.filter((enemy) => enemy.source === 'periodic')).toHaveLength(4);
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

  it('provides distinct playable climax bosses and bounded completion states', () => {
    for (const [world, boss] of [['master', 'exam'], ['work', 'delivery']] as const) {
      const simulation = new ScenarioSimulation(world, 5);
      simulation.startReview('climax');
      run(simulation, 3.2);
      expect(simulation.snapshot().climax.phase).toBe('active');
      expect(simulation.snapshot().enemies.some((enemy) => enemy.kind === boss && enemy.source === 'climax')).toBe(true);
      run(simulation, 14);
      expect(simulation.snapshot().completed).toBe(true);
    }
  });
});
