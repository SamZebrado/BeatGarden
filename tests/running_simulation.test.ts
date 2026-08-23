import { describe, expect, it } from 'vitest';
import { isCurrentRunV1 } from '../src/running/core/currentRun';
import { MAX_RUNNING_ENEMIES, RUNNING_WORLD, RunningSimulation, placeSpawnAtDistance } from '../src/running/core/simulation';

function run(simulation: RunningSimulation, seconds: number, x = 0, y = 0): void {
  for (let time = 0; time < seconds; time += 1 / 60) {
    choosePending(simulation);
    simulation.step(1 / 60, { x, y });
  }
}

describe('Running fixed-step authority', () => {
  it('is deterministic for a seed and input stream', () => {
    const first = new RunningSimulation(42);
    const second = new RunningSimulation(42);
    run(first, 12, 0.4, -0.2);
    run(second, 12, 0.4, -0.2);
    expect(first.snapshot()).toEqual(second.snapshot());
  });

  it('normalizes diagonal motion and clamps the player to the world', () => {
    const straight = new RunningSimulation(1);
    const diagonal = new RunningSimulation(1);
    run(straight, 1, 1, 0);
    run(diagonal, 1, 1, 1);
    const a = straight.snapshot().player;
    const b = diagonal.snapshot().player;
    expect(Math.hypot(a.x - 640, a.y - 360)).toBeCloseTo(Math.hypot(b.x - 640, b.y - 360), 5);
    run(straight, 30, 1, 0);
    expect(straight.snapshot().player.x).toBe(1262);
  });

  it('runs automatic offense, drops XP, and pauses for a real upgrade choice', () => {
    const simulation = new RunningSimulation(7);
    run(simulation, 24);
    const before = simulation.snapshot();
    expect(before.defeated).toBeGreaterThan(0);
    expect(before.level).toBeGreaterThanOrEqual(2);
    if (before.upgradePending) {
      const frozenTime = before.time;
      simulation.step(1 / 60, { x: 1, y: 0 });
      expect(simulation.snapshot().time).toBe(frozenTime);
      expect(simulation.chooseUpgrade('orbit')).toBe(true);
      expect(simulation.snapshot().orbitCount).toBe(2);
    }
  });

  it('keeps dense gameplay inside the persisted enemy bound', () => {
    const simulation = new RunningSimulation(70, { automaticOffense: false });
    for (let index = 0; index < 4; index += 1) simulation.startSceneReview('dense');
    const exported = simulation.exportState();
    expect(exported.enemies).toHaveLength(MAX_RUNNING_ENEMIES);
    expect(isCurrentRunV1({ version: 1, status: 'active', savedAt: 1, seed: 70, world: 'phd', difficulty: 'garden', simulation: exported })).toBe(true);
  });

  it('continues after the lifestyle countdown reaches zero', () => {
    const original = new RunningSimulation(71, { automaticOffense: false });
    original.startChoiceReview('lifestyle');
    expect(original.choosePhdOption('mindfulness')).toBe(true);
    const state = original.exportState();
    state.phd.state.lifestyle!.remaining = 1 / 60;
    state.spawnTimer = 999;
    const simulation = new RunningSimulation(71, { automaticOffense: false, restore: state });
    const before = simulation.snapshot().time;
    simulation.step(1 / 60, { x: 0, y: 0 });
    expect(simulation.snapshot().phd.lifestyle).toBeNull();
    simulation.step(1 / 60, { x: 1, y: 0 });
    expect(simulation.snapshot().time).toBeGreaterThan(before + 1 / 60);
  });

  it('exposes the second-meeting supervisor request and resumes after a response', () => {
    const original = new RunningSimulation(72, { automaticOffense: false });
    original.startChoiceReview('supervisor');
    expect(original.choosePhdOption('controlling')).toBe(true);
    const state = original.exportState();
    state.meetingPhase = 'telegraph';
    state.meetingRemaining = 1 / 60;
    state.meetingCount = 1;
    state.spawnTimer = 999;
    state.phd.state.supervisorRequests = 1;
    const simulation = new RunningSimulation(72, { automaticOffense: false, restore: state });
    simulation.step(1 / 60, { x: 0, y: 0 });
    expect(simulation.snapshot().phd.choice?.kind).toBe('supervisorRequest');
    const pausedAt = simulation.snapshot().time;
    simulation.step(1 / 60, { x: 1, y: 0 });
    expect(simulation.snapshot().time).toBe(pausedAt);
    expect(simulation.choosePhdOption('setBoundary')).toBe(true);
    simulation.step(1 / 60, { x: 1, y: 0 });
    expect(simulation.snapshot().time).toBeGreaterThan(pausedAt);
  });

  it('reports deterministic Orbit contact and Orbit-caused defeat feedback', () => {
    const original = new RunningSimulation(73, { automaticOffense: false, firstMeetingAt: 999 });
    original.step(1 / 60, { x: 0, y: 0 });
    const state = original.exportState();
    const enemy = state.enemies[0]!;
    enemy.x = state.player.x + 64;
    enemy.y = state.player.y;
    enemy.hp = 0.01;
    state.spawnTimer = 999;
    state.shotTimer = 999;
    const simulation = new RunningSimulation(73, { restore: state });
    simulation.step(1 / 60, { x: 0, y: 0 });
    expect(simulation.snapshot().orbitContacts).toEqual([
      expect.objectContaining({ nodeIndex: 0, defeated: true }),
    ]);
    expect(simulation.snapshot().enemies.some((item) => item.id === enemy.id)).toBe(false);
    expect(simulation.snapshot().hitPulses.some((pulse) => pulse.color === 0x73f2aa)).toBe(true);
  });

  it('telegraphs and starts the first periodic Lab Meeting deterministically', () => {
    const simulation = new RunningSimulation(9, { firstMeetingAt: 0 });
    for (let frame = 0; frame < 44.9 * 60; frame += 1) {
      if (simulation.snapshot().upgradePending) simulation.chooseUpgrade('vitality');
      choosePending(simulation);
      const angle = frame / 150;
      simulation.step(1 / 60, { x: Math.cos(angle), y: Math.sin(angle) });
    }
    expect(simulation.snapshot().phd.supervisorId).toBeNull();
    expect(simulation.snapshot().meeting.phase).toBe('idle');
    for (let frame = 0; frame < .3 * 60; frame += 1) {
      if (simulation.snapshot().upgradePending) simulation.chooseUpgrade('vitality');
      choosePending(simulation);
      simulation.step(1 / 60, { x: 1, y: 0 });
    }
    expect(simulation.snapshot().phd.supervisorId).not.toBeNull();
    expect(simulation.snapshot().meeting.phase).toBe('telegraph');
    for (let frame = 0; frame < 3.1 * 60; frame += 1) {
      if (simulation.snapshot().upgradePending) simulation.chooseUpgrade('vitality');
      choosePending(simulation);
      simulation.step(1 / 60, { x: 1, y: 0 });
    }
    const meeting = simulation.snapshot().meeting;
    expect(meeting.phase).toBe('active');
    expect(meeting.count).toBe(1);
  });

  it('rejects unsafe fixed steps instead of hiding frame stalls in gameplay', () => {
    const simulation = new RunningSimulation(3);
    simulation.step(0.2, { x: 1, y: 0 });
    expect(simulation.snapshot().time).toBe(0);
  });

  it('makes Sprout materially safer and Storm materially faster under identical input', () => {
    const sprout = new RunningSimulation(12, { difficulty: 'sprout', firstMeetingAt: 999 });
    const storm = new RunningSimulation(12, { difficulty: 'storm', firstMeetingAt: 999 });
    run(sprout, 0.3);
    run(storm, 0.3);
    const sproutState = sprout.snapshot();
    const stormState = storm.snapshot();
    const distance = (state: typeof sproutState) => Math.hypot(state.enemies[0]!.x - state.player.x, state.enemies[0]!.y - state.player.y);
    expect(distance(stormState)).toBeLessThan(distance(sproutState));
  });

  it('preserves ordinary spawn distance at every edge and corner', () => {
    const points = boundaryPoints();
    for (const point of points) {
      const simulation = new RunningSimulation(81, { initialPlayer: point, firstMeetingAt: 999 });
      simulation.step(1 / 60, { x: 0, y: 0 });
      const snapshot = simulation.snapshot();
      const enemy = snapshot.enemies[0];
      expect(enemy).toBeDefined();
      // One chase step has occurred after spawning, so allow its sub-2px approach.
      expect(Math.hypot(enemy!.x - snapshot.player.x, enemy!.y - snapshot.player.y)).toBeGreaterThan(358);
    }
  });

  it('keeps every meeting-ring placement distant at every edge and corner', () => {
    for (const point of boundaryPoints()) {
      for (let index = 0; index < 10; index += 1) {
        const distance = 360 + ((index * 37) % 90);
        const spawn = placeSpawnAtDistance(point, (index / 10) * Math.PI * 2, distance);
        expect(Math.hypot(spawn.x - point.x, spawn.y - point.y)).toBeCloseTo(distance, 8);
        expect(Math.hypot(spawn.x - point.x, spawn.y - point.y)).toBeGreaterThanOrEqual(360);
      }
      const simulation = new RunningSimulation(82, { initialPlayer: point, firstMeetingAt: 0 });
      simulation.startChoiceReview('supervisor');
      simulation.choosePhdOption('supportive');
      runWithUpgrades(simulation, 3.1);
      expect(simulation.snapshot().meeting.count).toBe(1);
      expect(simulation.snapshot().enemies.filter((enemy) => enemy.kind !== 'mite').length).toBeGreaterThanOrEqual(10);
    }
  });

  it('turns Qualifying into a timed combat arena rather than a hidden boolean check', () => {
    const simulation = new RunningSimulation(93);
    simulation.startMilestoneReview('qualifying');
    run(simulation, 5.7, 1, 0);
    const state = simulation.snapshot();
    expect(state.phd.milestone?.kind).toBe('qualifying');
    expect(state.phd.milestone?.phase).toBe('presentation');
    expect(state.phd.milestone?.target).toBeGreaterThan(0);
    expect(state.enemies.some((enemy) => enemy.kind === 'reviewer')).toBe(true);
    expect(state.enemies.filter((enemy) => enemy.source === 'milestone').length).toBeGreaterThan(0);
  });

  it('initializes one nine-person Qualifying roster and never replenishes it', () => {
    const simulation = new RunningSimulation(930, { automaticOffense: false });
    simulation.startMilestoneReview('qualifying');
    run(simulation, 5.6, 1, 0);
    const initial = simulation.snapshot();
    expect(initial.phd.milestone?.target).toBe(9);
    expect(initial.enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(9);
    expect(initial.enemies.every((enemy) => enemy.source === 'milestone')).toBe(true);

    const firstId = initial.enemies[0]!.id;
    expect(simulation.defeatMilestoneTargetForReview(firstId)).toBe(true);
    expect(simulation.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(8);
    run(simulation, 12, 1, 0);
    expect(simulation.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(8);
  });

  it('suspends recurring supervisor meetings for the full finite Qualifying arena', () => {
    const simulation = new RunningSimulation(932, { automaticOffense: false, firstMeetingAt: 0, difficulty: 'sprout' });
    simulation.startChoiceReview('supervisor');
    simulation.choosePhdOption('controlling');
    simulation.startMilestoneReview('qualifying');
    run(simulation, 9, 1, 0);
    const state = simulation.snapshot();
    expect(state.phd.milestone?.phase).toBe('presentation');
    expect(state.meeting).toEqual({ phase: 'idle', remaining: 0, count: 0 });
    expect(state.enemies).toHaveLength(9);
    expect(state.enemies.every((enemy) => enemy.source === 'milestone')).toBe(true);
  });

  it('preserves difficulty through milestone preparation timing', () => {
    const sprout = new RunningSimulation(933, { automaticOffense: false, difficulty: 'sprout' });
    const storm = new RunningSimulation(933, { automaticOffense: false, difficulty: 'storm' });
    sprout.startMilestoneReview('qualifying');
    storm.startMilestoneReview('qualifying');
    run(sprout, 5.2, 1, 0);
    run(storm, 5.2, 1, 0);
    expect(sprout.snapshot().phd.milestone?.phase).toBe('rehearsal');
    expect(storm.snapshot().phd.milestone?.phase).toBe('presentation');
  });

  it('passes Qualifying by reducing the designated roster from nine to zero', () => {
    const simulation = new RunningSimulation(931);
    simulation.startMilestoneReview('qualifying');
    run(simulation, 5.6, 1, 0);
    for (const enemy of simulation.snapshot().enemies) {
      expect(simulation.defeatMilestoneTargetForReview(enemy.id)).toBe(true);
    }
    const completed = simulation.snapshot();
    expect(completed.enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(0);
    expect(completed.phd.qualifying).toBe('passed');
    expect(completed.phd.milestone).toBeNull();
  });

  it('gives the Defense arena a distinct milestone-tagged Committee boss', () => {
    const simulation = new RunningSimulation(94);
    simulation.startMilestoneReview('defense');
    run(simulation, 6.6, 1, 0);
    const boss = simulation.snapshot().enemies.find((enemy) => enemy.kind === 'committee');
    expect(boss?.source).toBe('milestone');
    expect(boss?.radius).toBe(42);
    expect(simulation.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(5);
  });
});

function boundaryPoints(): Array<{ x: number; y: number }> {
  const inset = 18;
  return [
    { x: inset, y: inset }, { x: RUNNING_WORLD.width / 2, y: inset },
    { x: RUNNING_WORLD.width - inset, y: inset }, { x: inset, y: RUNNING_WORLD.height / 2 },
    { x: RUNNING_WORLD.width - inset, y: RUNNING_WORLD.height / 2 },
    { x: inset, y: RUNNING_WORLD.height - inset },
    { x: RUNNING_WORLD.width / 2, y: RUNNING_WORLD.height - inset },
    { x: RUNNING_WORLD.width - inset, y: RUNNING_WORLD.height - inset },
  ];
}

function runWithUpgrades(simulation: RunningSimulation, seconds: number): void {
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    if (simulation.snapshot().upgradePending) simulation.chooseUpgrade('vitality');
    choosePending(simulation);
    simulation.step(1 / 60, { x: 0, y: 0 });
  }
}

function choosePending(simulation: RunningSimulation): void {
  const choice = simulation.snapshot().phd.choice;
  if (choice) simulation.choosePhdOption(choice.options[0]);
}
