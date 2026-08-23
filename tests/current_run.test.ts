import { describe, expect, it } from 'vitest';
import { clearCurrentRun, CURRENT_RUN_STORAGE_KEY, loadCurrentRun, saveCurrentRun, type CurrentRunV1 } from '../src/running/core/currentRun';
import { RunningSimulation } from '../src/running/core/simulation';
import { ScenarioSimulation } from '../src/running/core/scenarioSimulation';

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

function runPhd(simulation: RunningSimulation, frames: number, offset = 0): void {
  for (let frame = 0; frame < frames; frame += 1) {
    const state = simulation.snapshot();
    if (state.phd.choice) simulation.choosePhdOption(state.phd.choice.options[0]);
    if (state.upgradePending) simulation.chooseUpgrade('cadence');
    simulation.step(1 / 60, { x: Math.cos((frame + offset) / 71), y: Math.sin((frame + offset) / 83) });
  }
}

function runScenario(simulation: ScenarioSimulation, frames: number, offset = 0): void {
  for (let frame = 0; frame < frames; frame += 1) {
    const state = simulation.snapshot();
    if (state.choice) simulation.choose(state.choice.options[0]);
    simulation.step(1 / 60, { x: Math.cos((frame + offset) / 71), y: Math.sin((frame + offset) / 83) });
  }
}

function runUntilScenarioChoice(simulation: ScenarioSimulation, kind: string, maxFrames: number): void {
  for (let frame = 0; frame < maxFrames; frame += 1) {
    const choice = simulation.snapshot().choice;
    if (choice?.kind === kind) return;
    if (choice) simulation.choose(choice.options[0]);
    simulation.step(1 / 60, { x: 0, y: 0 });
  }
}

describe('versioned current Running run', () => {
  it('round-trips the authoritative PhD state and preserves RNG continuation', () => {
    const original = new RunningSimulation(123, { difficulty: 'storm' });
    runPhd(original, 1200);
    const restored = new RunningSimulation(123, { difficulty: 'storm', restore: original.exportState() });
    expect(authoritativePhd(restored.snapshot())).toEqual(authoritativePhd(original.snapshot()));
    runPhd(original, 600, 1200);
    runPhd(restored, 600, 1200);
    expect(authoritativePhd(restored.snapshot())).toEqual(authoritativePhd(original.snapshot()));
  });

  it.each(['master', 'work'] as const)('round-trips %s mid-run and preserves RNG continuation', (world) => {
    const original = new ScenarioSimulation(world, 456, 'garden');
    runScenario(original, 900);
    const restored = new ScenarioSimulation(world, 456, 'garden', { restore: original.exportState() });
    const run: CurrentRunV1 = { version: 1, status: 'active', savedAt: 1, seed: 456, world, difficulty: 'garden', simulation: original.exportState() };
    expect(() => saveCurrentRun(run, memoryStorage())).not.toThrow();
    expect(authoritativeScenario(restored.snapshot())).toEqual(authoritativeScenario(original.snapshot()));
    runScenario(original, 600, 900);
    runScenario(restored, 600, 900);
    expect(restored.snapshot()).toEqual(original.snapshot());
  });

  it('does not regenerate a finite PhD milestone roster after restore', () => {
    const original = new RunningSimulation(7, { automaticOffense: false });
    original.startMilestoneReview('defense');
    for (let frame = 0; frame < 400; frame += 1) original.step(1 / 60, { x: 0, y: 0 });
    const first = original.snapshot();
    expect(first.enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(5);
    original.defeatMilestoneTargetForReview(first.enemies[0].id);
    const restored = new RunningSimulation(7, { automaticOffense: false, restore: original.exportState() });
    restored.step(1 / 60, { x: 0, y: 0 });
    expect(restored.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(4);
  });

  it('restores PhD supervisor, project, assigned labor, boundary, lifestyle, year, and milestone authority', () => {
    const original = new RunningSimulation(17, { automaticOffense: false });
    original.startChoiceReview('supervisor');
    original.choosePhdOption('controlling');
    runPhd(original, 760);
    if (original.snapshot().phd.choice?.kind === 'project') original.choosePhdOption('riskyIdea');
    original.startSupervisorFeedbackReview('controlling');
    original.startSupervisorFeedbackReview('controlling');
    expect(original.snapshot().phd.choice?.kind).toBe('supervisorRequest');
    original.choosePhdOption('accept');
    original.startChoiceReview('lifestyle');
    original.choosePhdOption('exercise');
    original.startMilestoneReview('qualifying');
    const restored = new RunningSimulation(17, { automaticOffense: false, restore: original.exportState() });
    expect(restored.snapshot().phd).toEqual(original.snapshot().phd);
    expect(restored.snapshot().phd).toMatchObject({ supervisorId: 'controlling', assignedLabor: 14, lifestyle: { id: 'exercise' }, milestone: { kind: 'qualifying' } });
  });

  it('restores Qualifying at exactly five of nine targets, never replenishes, then passes once', () => {
    const original = new RunningSimulation(27, { automaticOffense: false });
    original.startMilestoneReview('qualifying');
    for (let frame = 0; frame < 350; frame += 1) original.step(1 / 60, { x: 0, y: 0 });
    const roster = original.snapshot().enemies.filter((enemy) => enemy.source === 'milestone');
    expect(roster).toHaveLength(9);
    for (const enemy of roster.slice(0, 4)) original.defeatMilestoneTargetForReview(enemy.id);
    const restored = new RunningSimulation(27, { automaticOffense: false, restore: original.exportState() });
    expect(restored.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(5);
    for (let frame = 0; frame < 600; frame += 1) restored.step(1 / 60, { x: 0, y: 0 });
    const remaining = restored.snapshot().enemies.filter((enemy) => enemy.source === 'milestone');
    expect(remaining).toHaveLength(5);
    for (const enemy of remaining) restored.defeatMilestoneTargetForReview(enemy.id);
    expect(restored.snapshot().phd.qualifying).toBe('passed');
    expect(restored.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(0);
  });

  it('restores Master Proposal roster/progress and applies Career Plan only once', () => {
    const original = new ScenarioSimulation('master', 31, 'garden', { automaticOffense: false, damageEnabled: false });
    runScenario(original, 3900);
    const proposal = original.snapshot().masterPath?.proposal;
    expect(proposal?.phase).toBe('presentation');
    const roster = original.snapshot().enemies.filter((enemy) => enemy.source === 'milestone');
    expect(roster).toHaveLength(6);
    for (const enemy of roster.slice(0, 3)) original.defeatDesignatedTargetForReview(enemy.id);
    const restored = new ScenarioSimulation('master', 31, 'garden', { automaticOffense: false, damageEnabled: false, restore: original.exportState() });
    expect(restored.snapshot().masterPath?.proposal.progress).toBe(3);
    expect(restored.snapshot().enemies.filter((enemy) => enemy.source === 'milestone')).toHaveLength(3);
    for (const enemy of restored.snapshot().enemies.filter((item) => item.source === 'milestone')) restored.defeatDesignatedTargetForReview(enemy.id);
    runScenario(restored, 1);
    const choice = restored.snapshot().choice;
    expect(choice?.kind).toBe('careerPlan');
    restored.choose('employment');
    const once = restored.snapshot();
    const twiceRestored = new ScenarioSimulation('master', 31, 'garden', { restore: restored.exportState() });
    expect(twiceRestored.snapshot()).toEqual(once);
    expect(twiceRestored.snapshot().masterPath?.careerPlan).toBe('employment');
  });

  it('restores Work trial, active priority, market/experience, and resolved conversion without duplicate cost', () => {
    const original = new ScenarioSimulation('work', 37, 'garden', { damageEnabled: false });
    original.choose('offer-a');
    runUntilScenarioChoice(original, 'workPriority', 400);
    expect(original.snapshot().choice?.kind).toBe('workPriority');
    original.choose('protectFocus');
    runScenario(original, 180);
    const active = original.snapshot();
    const restored = new ScenarioSimulation('work', 37, 'garden', { damageEnabled: false, restore: original.exportState() });
    expect(restored.snapshot()).toEqual(active);
    expect(restored.snapshot().priorityRemaining).toBeGreaterThan(0);
    runUntilScenarioChoice(restored, 'workConversion', 1800);
    expect(restored.snapshot().choice?.kind).toBe('workConversion');
    restored.choose('continue');
    const resolved = restored.snapshot();
    const resolvedAgain = new ScenarioSimulation('work', 37, 'garden', { restore: restored.exportState() });
    expect(resolvedAgain.snapshot()).toEqual(resolved);
    expect(resolvedAgain.snapshot().choice).toBeNull();
    expect(resolvedAgain.snapshot().workPath).toMatchObject({ managerId: resolved.workPath?.managerId, marketStrength: resolved.workPath?.marketStrength, experience: resolved.workPath?.experience });
  });

  it('persists one current-run key and corruption removes only that key', () => {
    const storage = memoryStorage({ 'beatgarden.settings.v1': '{"musicVolume":0.4}', 'beatgarden.running.v2': '{"version":2}' });
    const simulation = new RunningSimulation(99);
    const run: CurrentRunV1 = { version: 1, status: 'active', savedAt: Date.now(), seed: 99, world: 'phd', difficulty: 'garden', simulation: simulation.exportState() };
    saveCurrentRun(run, storage);
    expect(loadCurrentRun(storage)).toEqual(run);
    storage.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify({ ...run, simulation: { ...run.simulation, enemies: new Array(65).fill(run.simulation.player) } }));
    expect(loadCurrentRun(storage)).toBeNull();
    expect(storage.values.get('beatgarden.settings.v1')).toBe('{"musicVolume":0.4}');
    expect(storage.values.get('beatgarden.running.v2')).toBe('{"version":2}');
    clearCurrentRun(storage);
  });

  it.each([
    '{bad',
    JSON.stringify({ version: 2 }),
    JSON.stringify({ version: 1, status: 'active', world: 'moon', difficulty: 'garden', seed: 1, savedAt: 1, simulation: {} }),
    JSON.stringify({ version: 1, status: 'active', world: 'phd', difficulty: 'garden', seed: 1, savedAt: 1, simulation: {} }),
  ])('rejects malformed, old, impossible-enum, and partial snapshots safely', (payload) => {
    const storage = memoryStorage({ [CURRENT_RUN_STORAGE_KEY]: payload, 'beatgarden.best.firefly-dock': '{"score":99}' });
    expect(loadCurrentRun(storage)).toBeNull();
    expect(storage.values.get('beatgarden.best.firefly-dock')).toBe('{"score":99}');
  });

  it('rejects semantically corrupt nested PhD authority and isolates every other save key', () => {
    const qualifying = new RunningSimulation(71, { automaticOffense: false });
    qualifying.startMilestoneReview('qualifying');
    for (let frame = 0; frame < 350; frame += 1) qualifying.step(1 / 60, { x: 0, y: 0 });
    const base: CurrentRunV1 = { version: 1, status: 'active', savedAt: 1, seed: 71, world: 'phd', difficulty: 'garden', simulation: qualifying.exportState() };
    const corruptions: Array<(run: any) => void> = [
      (run) => { run.simulation.phd.state.choice = { kind: 'nonsense', options: [] }; },
      (run) => { run.simulation.phd.state.milestone.phase = 'nonsense'; },
      (run) => { run.simulation.phd.state.supervisorId = 'supportive'; run.simulation.phd.state.supervisorPersonId = 'rowan'; },
      (run) => { run.simulation.enemies[0].source = 'ambient'; },
      (run) => { run.simulation.enemies[0].kind = 'garbage'; },
      (run) => { run.simulation.projectiles = [{ id: run.simulation.nextId++, x: 1, y: 1, vx: 1, vy: 1, radius: 1, ttl: 1 }]; },
      (run) => { run.simulation.enemies[1].id = run.simulation.enemies[0].id; },
      (run) => { run.simulation.nextId = Math.max(...run.simulation.enemies.map((enemy: any) => enemy.id)); },
      (run) => { run.simulation.phd.state.milestone.progress += 1; },
    ];
    for (const corrupt of corruptions) expectOnlyCurrentRunRejected(base, corrupt);
  });

  it('rejects semantically corrupt Master and Work authority, including finite rosters', () => {
    const master = new ScenarioSimulation('master', 73, 'garden', { automaticOffense: false, damageEnabled: false });
    runScenario(master, 3900);
    const masterRun: CurrentRunV1 = { version: 1, status: 'active', savedAt: 1, seed: 73, world: 'master', difficulty: 'garden', simulation: master.exportState() };
    const work = new ScenarioSimulation('work', 79, 'garden');
    const workRun: CurrentRunV1 = { version: 1, status: 'active', savedAt: 1, seed: 79, world: 'work', difficulty: 'garden', simulation: work.exportState() };
    for (const corrupt of [
      (run: any) => { run.simulation.masterProposalPhase = 'nonsense'; },
      (run: any) => { run.simulation.masterSupervisor = 'garbage'; },
      (run: any) => { run.simulation.masterProposalProgress += 1; },
      (run: any) => { run.simulation.enemies[0].source = 'ambient'; },
      (run: any) => { run.simulation.choice = { kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] }; },
    ]) expectOnlyCurrentRunRejected(masterRun, corrupt);
    for (const corrupt of [
      (run: any) => { run.simulation.choice = { kind: 'workOffer', options: ['offer-a'] }; },
      (run: any) => { run.simulation.workStage = 'nonsense'; },
      (run: any) => { run.simulation.managerId = 'garbage'; },
      (run: any) => { run.simulation.enemies = [{ id: run.simulation.nextId++, kind: 'garbage', source: 'ambient', x: 1, y: 1, hp: 1, radius: 1, flash: 0 }]; },
      (run: any) => { run.simulation.pickups = [{ id: run.simulation.nextId++, x: 1, y: 1, radius: 1 }]; },
    ]) expectOnlyCurrentRunRejected(workRun, corrupt);
  });

  it('keeps representative authoritative snapshots comfortably bounded', () => {
    const phd = new RunningSimulation(51);
    runPhd(phd, 600);
    const qualifying = new RunningSimulation(52, { automaticOffense: false });
    qualifying.startMilestoneReview('qualifying');
    for (let frame = 0; frame < 350; frame += 1) qualifying.step(1 / 60, { x: 0, y: 0 });
    const master = new ScenarioSimulation('master', 53, 'garden', { automaticOffense: false, damageEnabled: false });
    runScenario(master, 3900);
    const work = new ScenarioSimulation('work', 54);
    work.startReview('dense');
    const bytes = {
      normalPhd: JSON.stringify(phd.exportState()).length,
      qualifyingNine: JSON.stringify(qualifying.exportState()).length,
      masterProposal: JSON.stringify(master.exportState()).length,
      denseWork: JSON.stringify(work.exportState()).length,
    };
    console.info(`CURRENT_RUN_SNAPSHOT_BYTES ${JSON.stringify(bytes)}`);
    expect(Math.max(...Object.values(bytes))).toBeLessThan(100_000);
  });
});

function expectOnlyCurrentRunRejected(base: CurrentRunV1, corrupt: (run: any) => void): void {
  const candidate = structuredClone(base) as any;
  corrupt(candidate);
  const storage = memoryStorage({
    [CURRENT_RUN_STORAGE_KEY]: JSON.stringify(candidate),
    'beatgarden.running.v2': '{"version":2,"totalRuns":4}',
    'beatgarden.rhythm.progress.v1': '{"unlocked":true}',
  });
  expect(loadCurrentRun(storage)).toBeNull();
  expect(storage.values.has(CURRENT_RUN_STORAGE_KEY)).toBe(false);
  expect(storage.values.get('beatgarden.running.v2')).toBe('{"version":2,"totalRuns":4}');
  expect(storage.values.get('beatgarden.rhythm.progress.v1')).toBe('{"unlocked":true}');
}

function authoritativePhd(snapshot: ReturnType<RunningSimulation['snapshot']>) {
  return { ...snapshot, enemies: snapshot.enemies.map((enemy) => ({ ...enemy, flash: 0 })), hitPulses: [] };
}

function authoritativeScenario(snapshot: ReturnType<ScenarioSimulation['snapshot']>) {
  return { ...snapshot, enemies: snapshot.enemies.map((enemy) => ({ ...enemy, flash: 0 })) };
}
