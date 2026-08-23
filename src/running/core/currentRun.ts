import type { RunningDifficulty } from './difficulty';
import type { RunningSimulationStateV1 } from './simulation';
import type { ScenarioSimulationStateV1, ScenarioWorld } from './scenarioSimulation';

export const CURRENT_RUN_STORAGE_KEY = 'beatgarden.running.current.v1';

interface CurrentRunBaseV1 {
  version: 1;
  status: 'active';
  savedAt: number;
  seed: number;
  difficulty: RunningDifficulty;
}

export type CurrentRunV1 =
  | CurrentRunBaseV1 & { world: 'phd'; simulation: RunningSimulationStateV1 }
  | CurrentRunBaseV1 & { world: ScenarioWorld; simulation: ScenarioSimulationStateV1 };

type CurrentRunStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function loadCurrentRun(storage: CurrentRunStorage | null = browserStorage()): CurrentRunV1 | null {
  if (!storage) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(storage.getItem(CURRENT_RUN_STORAGE_KEY) ?? 'null'); } catch { parsed = null; }
  if (isCurrentRunV1(parsed)) return parsed;
  if (storage.getItem(CURRENT_RUN_STORAGE_KEY) !== null) storage.removeItem(CURRENT_RUN_STORAGE_KEY);
  return null;
}

export function saveCurrentRun(run: CurrentRunV1, storage: CurrentRunStorage | null = browserStorage()): void {
  if (!isCurrentRunV1(run)) throw new Error('Refusing to persist an invalid Running snapshot.');
  storage?.setItem(CURRENT_RUN_STORAGE_KEY, JSON.stringify(run));
}

export function clearCurrentRun(storage: Pick<Storage, 'removeItem'> | null = browserStorage()): void {
  storage?.removeItem(CURRENT_RUN_STORAGE_KEY);
}

export function isCurrentRunV1(value: unknown): value is CurrentRunV1 {
  if (!record(value) || value.version !== 1 || value.status !== 'active' || !world(value.world) || !difficulty(value.difficulty)) return false;
  if (!safeInteger(value.seed, 0, 0xffffffff) || !finite(value.savedAt, 0, 1e16) || !record(value.simulation)) return false;
  if (!safeTree(value, 0)) return false;
  return value.world === 'phd' ? validPhdSimulation(value.simulation) : validScenarioSimulation(value.simulation, value.world);
}

function validPhdSimulation(s: Record<string, unknown>): boolean {
  if (!finiteKeys(s, ['nextId', 'spawnTimer', 'shotTimer', 'meetingAt', 'meetingRemaining', 'meetingCount', 'time', 'level', 'xp', 'defeated'])) return false;
  if (!safeInteger(s.rngState, 0, 0xffffffff) || !safeInteger(s.nextId, 1, 1e9) || !safeInteger(s.level, 1, 1e6) || !safeInteger(s.defeated, 0, 1e9)) return false;
  if (!['idle', 'telegraph', 'active'].includes(String(s.meetingPhase)) || !boolKeys(s, ['milestoneRosterInitialized', 'upgradePending', 'gameOver'])) return false;
  if (!phdEnemyArray(s.enemies) || !projectileArray(s.projectiles, 256) || !pickupArray(s.pickups, 128) || !pulseArray(s.hitPulses)) return false;
  if (!record(s.upgrades) || !integerKeys(s.upgrades, ['orbit', 'cadence', 'vitality'], 0, 1e6) || !validPlayer(s.player)) return false;
  if (!record(s.phd) || !record(s.phd.state) || !finiteKeys(s.phd, ['nextProjectAt', 'nextQualifyingPrompt', 'nextDefensePrompt', 'nextLifestyleAt', 'pausedAcademicTime', 'milestoneTimingScale'])) return false;
  const state = s.phd.state;
  if (!finiteKeys(state, ['energy', 'focus', 'spirit', 'calendarLoad', 'signal', 'noise', 'pollution', 'logic', 'clarity', 'boundary', 'purpose', 'connection', 'evidence', 'year', 'seasonPulse', 'annualReviews', 'completedProjects', 'independentResearch', 'assignedLabor', 'supervisorRequests', 'revisionRemaining'])) return false;
  if (!validPhdState(state)) return false;
  if (!uniqueEnumArray(s.phd.contributions, PROJECT_IDS)) return false;
  if (!uniqueIdsAndNext(s.nextId, s.enemies, s.projectiles, s.pickups, s.hitPulses)) return false;
  return validPhdRoster(s, state);
}

function validScenarioSimulation(s: Record<string, unknown>, world: 'master' | 'work'): boolean {
  const numbers = ['nextId', 'time', 'spawnTimer', 'shotTimer', 'eventAt', 'eventRemaining', 'nextChoiceAt', 'climaxProgress', 'defeated', 'energy', 'focus', 'spirit', 'calendar', 'progress', 'masterProposalRemaining', 'masterProposalProgress', 'marketStrength', 'experience', 'careerTime', 'workConversionScore', 'promotionProgress', 'nextMarketAt', 'nextConversionAt', 'nextClimaxAt', 'priorityRemaining'];
  if (!finiteKeys(s, numbers) || !safeInteger(s.rngState, 0, 0xffffffff) || !safeInteger(s.nextId, 1, 1e9) || !safeInteger(s.defeated, 0, 1e9)) return false;
  if (!boolKeys(s, ['climaxBossSpawned', 'completed', 'gameOver', 'masterProposalRosterInitialized', 'conversionChoiceShown'])) return false;
  if (!['idle', 'telegraph', 'active'].includes(String(s.eventPhase)) || !['none', 'termRush', 'daily', 'weekly'].includes(String(s.eventKind)) || !['none', 'telegraph', 'active'].includes(String(s.climaxPhase))) return false;
  if (typeof s.activePriority !== 'string' || s.activePriority.length > 8 || !validPlayer(s.player)) return false;
  if (!enumValue(s.masterSupervisor, [null, ...PERSON_IDS]) || !enumValue(s.masterCareerPlan, [null, ...CAREER_PLANS]) || !enumValue(s.masterProposalPhase, MASTER_PROPOSAL_PHASES)) return false;
  if (!enumValue(s.workStage, WORK_STAGES) || !enumValue(s.managerId, [null, ...MANAGER_IDS]) || !validScenarioChoice(s.choice, world)) return false;
  if (!safeInteger(s.masterProposalProgress, 0, 6) || !safeInteger(s.climaxProgress, 0, world === 'master' ? 5 : 16)) return false;
  if (world === 'master' && (s.workStage !== 'offers' || s.managerId !== null || s.conversionChoiceShown !== false)) return false;
  if (world === 'work' && (s.masterSupervisor !== null || s.masterCareerPlan !== null || s.masterProposalPhase !== 'none' || s.masterProposalRosterInitialized !== false || s.masterProposalProgress !== 0)) return false;
  if (!scenarioEnemyArray(s.enemies) || !projectileArray(s.projectiles, 256) || !pickupArray(s.pickups, 128)) return false;
  if (!uniqueIdsAndNext(s.nextId, s.enemies, s.projectiles, s.pickups)) return false;
  return validScenarioRoster(s, world);
}

const PROJECT_IDS = ['replication', 'riskyIdea', 'helping', 'prestige'] as const;
const SUPERVISOR_IDS = ['supportive', 'controlling', 'handsOff'] as const;
const LIFESTYLE_IDS = ['rest', 'exercise', 'social', 'mindfulness', 'weekendOvertime'] as const;
const PERSON_IDS = ['mei', 'rowan', 'lin'] as const;
const CAREER_PLANS = ['researchPhd', 'employment', 'undecided'] as const;
const MANAGER_IDS = ['clear-builder', 'opaque-driver', 'steady-coach'] as const;
const WORK_STAGES = ['offers', 'trial', 'conversion', 'employed', 'promotion'] as const;
const MASTER_PROPOSAL_PHASES = ['none', 'preparation', 'rehearsal', 'presentation', 'complete'] as const;

function validPhdState(state: Record<string, unknown>): boolean {
  if (!enumValue(state.supervisorId, [null, ...SUPERVISOR_IDS]) || !enumValue(state.supervisorPersonId, [null, ...PERSON_IDS])) return false;
  if (!enumValue(state.lastBoundaryReaction, ['none', 'respected', 'strained']) || !enumValue(state.thesisStage, ['seed', 'sapling', 'tree', 'bloom'])) return false;
  if (!enumValue(state.qualifying, ['locked', 'ready', 'passed']) || !enumValue(state.preDefense, ['hidden', 'ready', 'passed']) || !enumValue(state.defense, ['hidden', 'visible', 'ready', 'passed'])) return false;
  if (!enumValue(state.terminal, ['ongoing', 'finalYear', 'ended', 'graduated']) || typeof state.graduated !== 'boolean') return false;
  if (!nullableNumericRecord(state.supervisorFeedback, ['signal', 'noise', 'remaining'])) return false;
  if (!nullableTaggedRecord(state.lifestyle, 'id', LIFESTYLE_IDS, ['remaining'])) return false;
  if (!validActiveProject(state.activeProject)) return false;
  if (!nullableTaggedRecord(state.annualMilestone, 'kind', ['firstYearTalk', 'proposal', 'annualCommittee'], ['completedYear', 'remaining'])) return false;
  if (!validPhdChoice(state.choice) || !validMilestone(state.milestone)) return false;
  if (state.supervisorId === null !== (state.supervisorPersonId === null)) return false;
  const personForSupervisor = { supportive: 'mei', controlling: 'rowan', handsOff: 'lin' } as const;
  if (state.supervisorId !== null && state.supervisorPersonId !== personForSupervisor[state.supervisorId as keyof typeof personForSupervisor]) return false;
  return true;
}

function validPhdChoice(value: unknown): boolean {
  if (value === null) return true;
  if (!record(value) || typeof value.kind !== 'string') return false;
  const options: Record<string, readonly unknown[]> = {
    project: PROJECT_IDS, supervisor: SUPERVISOR_IDS, lifestyle: LIFESTYLE_IDS,
    supervisorRequest: ['accept', 'setBoundary', 'decline'], qualifying: ['attempt', 'defer'],
    preDefense: ['attempt', 'defer'], defense: ['attempt', 'defer'],
  };
  return value.kind in options && exactArray(value.options, options[value.kind]);
}

function validMilestone(value: unknown): boolean {
  if (value === null) return true;
  return record(value) && enumValue(value.kind, ['qualifying', 'defense'])
    && enumValue(value.stance, ['support', 'mixed', 'adversarial'])
    && enumValue(value.phase, ['preparation', 'rehearsal', 'presentation'])
    && finiteKeys(value, ['remaining', 'progress', 'target', 'damageScale'])
    && safeInteger(value.progress, 0, 9) && safeInteger(value.target, 1, 9)
    && value.target === (value.kind === 'qualifying' ? 9 : 5) && (value.progress as number) <= (value.target as number);
}

function validScenarioChoice(value: unknown, world: 'master' | 'work'): boolean {
  if (value === null) return true;
  if (!record(value) || typeof value.kind !== 'string') return false;
  const options: Record<string, readonly unknown[]> = {
    masterTrack: ['coursework', 'project', 'internship', 'jobSearch'], masterSupervisor: PERSON_IDS,
    careerPlan: CAREER_PLANS, workOffer: ['offer-a', 'offer-b', 'offer-c'],
    workConversion: ['continue', 'leaveSearch'], workPriority: ['protectFocus', 'acceptRush'],
  };
  const allowedKinds = world === 'master' ? ['masterTrack', 'masterSupervisor', 'careerPlan'] : ['workOffer', 'workConversion', 'workPriority'];
  return allowedKinds.includes(value.kind) && exactArray(value.options, options[value.kind]);
}

function phdEnemyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 64 && value.every((item) => entityBase(item)
    && enumValue(item.kind, ['mite', 'reviewer', 'chair', 'phone', 'committee'])
    && enumValue(item.source, ['ambient', 'meeting', 'milestone']) && positiveKeys(item, ['hp', 'radius']) && finiteKeys(item, ['flash']));
}

function scenarioEnemyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 64 && value.every((item) => entityBase(item)
    && enumValue(item.kind, ['courseBlock', 'deadline', 'exam', 'request', 'notification', 'delivery'])
    && enumValue(item.source, ['ambient', 'periodic', 'milestone', 'climax']) && positiveKeys(item, ['hp', 'radius']) && finiteKeys(item, ['flash']));
}

function projectileArray(value: unknown, max: number): boolean {
  return Array.isArray(value) && value.length <= max && value.every((item) => entityBase(item)
    && finiteKeys(item, ['vx', 'vy']) && positiveKeys(item, ['damage', 'radius', 'ttl']));
}

function pickupArray(value: unknown, max: number): boolean {
  return Array.isArray(value) && value.length <= max && value.every((item) => entityBase(item) && positiveKeys(item, ['value', 'radius']));
}

function pulseArray(value: unknown): boolean {
  return Array.isArray(value) && value.length <= 128 && value.every((item) => entityBase(item)
    && positiveKeys(item, ['ttl']) && safeInteger(item.color, 0, 0xffffff));
}

function validPlayer(value: unknown): boolean {
  return record(value) && finiteKeys(value, ['x', 'y', 'hp', 'maxHp', 'radius', 'invulnerable'])
    && finite(value.maxHp, Number.EPSILON, 1e9) && finite(value.radius, Number.EPSILON, 1e9) && finite(value.invulnerable, 0, 1e9);
}

function entityBase(value: unknown): value is Record<string, unknown> {
  return record(value) && safeInteger(value.id, 1, 1e9) && finiteKeys(value, ['x', 'y']);
}

function uniqueIdsAndNext(nextId: unknown, ...groups: unknown[]): boolean {
  const ids = groups.flatMap((group) => Array.isArray(group) ? group.map((item) => (item as Record<string, unknown>).id as number) : []);
  return new Set(ids).size === ids.length && ids.every((id) => id < (nextId as number));
}

function validPhdRoster(simulation: Record<string, unknown>, state: Record<string, unknown>): boolean {
  const milestone = state.milestone;
  const roster = (simulation.enemies as Record<string, unknown>[]).filter((enemy) => enemy.source === 'milestone');
  if (milestone === null) return !simulation.milestoneRosterInitialized && roster.length === 0;
  const arena = milestone as Record<string, unknown>;
  if (arena.phase !== 'presentation') return !simulation.milestoneRosterInitialized && roster.length === 0;
  if (!simulation.milestoneRosterInitialized) return false;
  return roster.length === (arena.target as number) - (arena.progress as number)
    && roster.every((enemy) => enemy.kind === 'reviewer' || enemy.kind === 'chair' || (arena.kind === 'defense' && enemy.kind === 'committee'));
}

function validScenarioRoster(s: Record<string, unknown>, world: 'master' | 'work'): boolean {
  const enemies = s.enemies as Record<string, unknown>[];
  const proposal = enemies.filter((enemy) => enemy.source === 'milestone');
  if (world === 'master' && s.masterProposalPhase === 'presentation') {
    if (!s.masterProposalRosterInitialized || proposal.length !== 6 - (s.masterProposalProgress as number)) return false;
  } else if (proposal.length !== 0 || (world === 'master' && s.masterProposalPhase !== 'complete' && s.masterProposalRosterInitialized)) return false;
  const climax = enemies.filter((enemy) => enemy.source === 'climax');
  if (s.climaxPhase === 'active' && s.climaxBossSpawned) {
    const expected = world === 'master' ? 5 - (s.climaxProgress as number) : (s.climaxProgress === 0 ? 1 : 0);
    if (climax.length !== expected || climax.some((enemy) => enemy.kind !== (world === 'master' ? 'exam' : 'delivery') && enemy.kind !== 'courseBlock')) return false;
  } else if (climax.length !== 0) return false;
  return true;
}

function nullableNumericRecord(value: unknown, keys: string[]): boolean { return value === null || (record(value) && finiteKeys(value, keys)); }
function validActiveProject(value: unknown): boolean {
  if (value === null) return true;
  if (!record(value) || !enumValue(value.id, PROJECT_IDS) || !finite(value.progress, 0, 1e9) || !finite(value.goal, Number.EPSILON, 1e9)) return false;
  return (value.progress as number) <= (value.goal as number);
}
function nullableTaggedRecord(value: unknown, tag: string, allowed: readonly unknown[], numbers: string[]): boolean {
  return value === null || (record(value) && enumValue(value[tag], allowed) && finiteKeys(value, numbers));
}
function exactArray(value: unknown, expected: readonly unknown[]): boolean {
  return Array.isArray(value) && value.length === expected.length && value.every((item, index) => item === expected[index]);
}
function uniqueEnumArray(value: unknown, allowed: readonly unknown[]): boolean {
  return Array.isArray(value) && value.length <= allowed.length && new Set(value).size === value.length && value.every((item) => allowed.includes(item));
}
function finiteKeys(value: Record<string, unknown>, keys: string[]): boolean { return keys.every((key) => finite(value[key], -1e9, 1e9)); }
function positiveKeys(value: Record<string, unknown>, keys: string[]): boolean { return keys.every((key) => finite(value[key], Number.EPSILON, 1e9)); }
function integerKeys(value: Record<string, unknown>, keys: string[], min: number, max: number): boolean { return keys.every((key) => safeInteger(value[key], min, max)); }
function boolKeys(value: Record<string, unknown>, keys: string[]): boolean { return keys.every((key) => typeof value[key] === 'boolean'); }
function enumValue(value: unknown, allowed: readonly unknown[]): boolean { return allowed.includes(value); }
function finite(value: unknown, min: number, max: number): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max; }
function safeInteger(value: unknown, min: number, max: number): value is number { return Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max; }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function world(value: unknown): value is CurrentRunV1['world'] { return value === 'phd' || value === 'master' || value === 'work'; }
function difficulty(value: unknown): value is RunningDifficulty { return value === 'sprout' || value === 'garden' || value === 'storm'; }
function safeTree(value: unknown, depth: number): boolean {
  if (depth > 9) return false;
  if (value === null || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.length <= 200;
  if (Array.isArray(value)) return value.length <= 256 && value.every((item) => safeTree(item, depth + 1));
  if (!record(value) || Object.keys(value).length > 80) return false;
  return Object.entries(value).every(([key, item]) => key.length <= 80 && safeTree(item, depth + 1));
}
function browserStorage(): CurrentRunStorage | null { if (typeof window === 'undefined') return null; try { return window.localStorage; } catch { return null; } }
