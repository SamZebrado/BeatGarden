import { describe, expect, it } from 'vitest';
import { adjustEnemyDamage, adjustEnemySpeed, adjustSpawnInterval, adjustTelegraphDuration, parseDifficulty } from '../src/running/core/difficulty';
import { RunningSimulation } from '../src/running/core/simulation';
import { ScenarioSimulation } from '../src/running/core/scenarioSimulation';

describe('three-world difficulty runtime wiring', () => {
  it('parses the production URL values defensively', () => {
    expect(parseDifficulty('sprout')).toBe('sprout');
    expect(parseDifficulty('storm')).toBe('storm');
    expect(parseDifficulty('garden')).toBe('garden');
    expect(parseDifficulty('unknown')).toBe('garden');
  });

  it('uses distinct speed, damage, spawn, and telegraph coefficients', () => {
    expect(adjustEnemySpeed(100, 'sprout')).toBe(78);
    expect(adjustEnemySpeed(100, 'storm')).toBe(118);
    expect(adjustEnemyDamage(100, 'sprout')).toBe(65);
    expect(adjustEnemyDamage(100, 'storm')).toBe(125);
    expect(adjustSpawnInterval(10, 'sprout')).toBe(12);
    expect(adjustSpawnInterval(10, 'storm')).toBe(8.2);
    expect(adjustTelegraphDuration(10, 'sprout')).toBe(13.5);
    expect(adjustTelegraphDuration(10, 'storm')).toBe(8);
  });

  it('wires PhD to difficulty and changes actual approach/meeting timing', () => {
    const sprout = new RunningSimulation(77, { difficulty: 'sprout', firstMeetingAt: 0 });
    const storm = new RunningSimulation(77, { difficulty: 'storm', firstMeetingAt: 0 });
    sprout.startChoiceReview('supervisor');
    storm.startChoiceReview('supervisor');
    sprout.choosePhdOption('supportive');
    storm.choosePhdOption('supportive');
    sprout.step(1 / 60, { x: 0, y: 0 });
    storm.step(1 / 60, { x: 0, y: 0 });
    const a = sprout.snapshot();
    const b = storm.snapshot();
    expect([a.difficulty, b.difficulty]).toEqual(['sprout', 'storm']);
    expect(a.meeting.remaining).toBeCloseTo(4.05, 8);
    expect(b.meeting.remaining).toBeCloseTo(2.4, 8);
    const distance = (state: typeof a) => Math.hypot(state.enemies[0]!.x - state.player.x, state.enemies[0]!.y - state.player.y);
    expect(distance(b)).toBeLessThan(distance(a));

    const safeRun = new RunningSimulation(89, { difficulty: 'sprout', firstMeetingAt: 999 });
    const hardRun = new RunningSimulation(89, { difficulty: 'storm', firstMeetingAt: 999 });
    advancePhd(safeRun, 4);
    advancePhd(hardRun, 4);
    const totalSpawned = (simulation: RunningSimulation) => simulation.snapshot().enemies.length + simulation.snapshot().defeated;
    expect(totalSpawned(hardRun)).toBeGreaterThan(totalSpawned(safeRun));

    const safeArena = new RunningSimulation(91, { difficulty: 'sprout', firstMeetingAt: 999 });
    const hardArena = new RunningSimulation(91, { difficulty: 'storm', firstMeetingAt: 999 });
    safeArena.startSceneReview('dense');
    hardArena.startSceneReview('dense');
    advancePhd(safeArena, 8);
    advancePhd(hardArena, 8);
    expect(hardArena.snapshot().player.hp).toBeLessThan(safeArena.snapshot().player.hp);
  });

  it.each(['master', 'work'] as const)('wires %s to difficulty and changes actual event timing', (world) => {
    const sprout = new ScenarioSimulation(world, 77, 'sprout');
    const storm = new ScenarioSimulation(world, 77, 'storm');
    sprout.startReview('event');
    storm.startReview('event');
    const a = sprout.snapshot();
    const b = storm.snapshot();
    expect([a.difficulty, b.difficulty]).toEqual(['sprout', 'storm']);
    expect(a.event.remaining).toBeCloseTo(2.7, 8);
    expect(b.event.remaining).toBeCloseTo(1.6, 8);

    const safeApproach = new ScenarioSimulation(world, 79, 'sprout');
    const hardApproach = new ScenarioSimulation(world, 79, 'storm');
    advanceScenario(safeApproach, 0.3);
    advanceScenario(hardApproach, 0.3);
    const distance = (simulation: ScenarioSimulation) => {
      const state = simulation.snapshot();
      return Math.hypot(state.enemies[0]!.x - state.player.x, state.enemies[0]!.y - state.player.y);
    };
    expect(distance(hardApproach)).toBeLessThan(distance(safeApproach));

    const safeRun = new ScenarioSimulation(world, 81, 'sprout');
    const hardRun = new ScenarioSimulation(world, 81, 'storm');
    advanceScenario(safeRun, 4);
    advanceScenario(hardRun, 4);
    const totalSpawned = (simulation: ScenarioSimulation) => simulation.snapshot().enemies.length + simulation.snapshot().defeated;
    expect(totalSpawned(hardRun)).toBeGreaterThan(totalSpawned(safeRun));

    const safeArena = new ScenarioSimulation(world, 92, 'sprout');
    const hardArena = new ScenarioSimulation(world, 92, 'storm');
    safeArena.startReview('dense');
    hardArena.startReview('dense');
    advanceScenario(safeArena, 8);
    advanceScenario(hardArena, 8);
    expect(hardArena.snapshot().player.hp).toBeLessThan(safeArena.snapshot().player.hp);
  });
});

function advancePhd(simulation: RunningSimulation, seconds: number): void {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    const state = simulation.snapshot();
    if (state.upgradePending) simulation.chooseUpgrade('vitality');
    if (state.phd.choice) simulation.choosePhdOption(state.phd.choice.options[0]);
    simulation.step(1 / 60, { x: 0, y: 0 });
  }
}

function advanceScenario(simulation: ScenarioSimulation, seconds: number): void {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    const choice = simulation.snapshot().choice;
    if (choice) simulation.choose(choice.options[0]);
    simulation.step(1 / 60, { x: 0, y: 0 });
  }
}
