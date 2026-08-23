import { createRng, type SeededRng } from './rng';
import { MAX_RUNNING_ENEMIES, RUNNING_WORLD, placeSpawnAtDistance, type RunningInput, type Vec2 } from './simulation';
import { adjustEnemyDamage, adjustEnemySpeed, adjustSpawnInterval, adjustTelegraphDuration, type RunningDifficulty } from './difficulty';
import { MANAGERS, WORK_OFFERS, conversionScore, effectiveWorkOffer, managerPersonBehavior, masterRoleOutcome, offerViability, seededMarketStrength, type CareerPlan, type ManagerId, type WorkStage } from './lifePaths';
import type { PersonId, StablePersonId } from './people';
import { cloneRelationship, defaultRelationship, updateRelationship, type RelationshipStateV1, type SituationState } from './personScience';

export type ScenarioWorld = 'master' | 'work';
export type ScenarioEnemyKind = 'courseBlock' | 'deadline' | 'exam' | 'request' | 'notification' | 'delivery';
export type ScenarioChoice =
  | { kind: 'masterTrack'; options: readonly ['coursework', 'project', 'internship', 'jobSearch'] }
  | { kind: 'masterSupervisor'; options: readonly PersonId[] }
  | { kind: 'careerPlan'; options: readonly CareerPlan[] }
  | { kind: 'workOffer'; options: readonly ['offer-a', 'offer-b', 'offer-c'] }
  | { kind: 'workConversion'; options: readonly ['continue', 'leaveSearch'] }
  | { kind: 'workPriority'; options: readonly ['protectFocus', 'acceptRush'] };

export interface ScenarioEnemy extends Vec2 {
  id: number;
  kind: ScenarioEnemyKind;
  hp: number;
  radius: number;
  source: 'ambient' | 'periodic' | 'milestone' | 'climax';
  flash: number;
}

export interface ScenarioProjectile extends Vec2 { id: number; vx: number; vy: number; damage: number; radius: number; ttl: number }
export interface ScenarioPickup extends Vec2 { id: number; value: number; radius: number }

export interface ScenarioSnapshot {
  world: ScenarioWorld;
  difficulty: RunningDifficulty;
  time: number;
  player: Vec2 & { hp: number; maxHp: number; radius: number; invulnerable: number };
  enemies: readonly ScenarioEnemy[];
  projectiles: readonly ScenarioProjectile[];
  pickups: readonly ScenarioPickup[];
  orbitCount: number;
  defeated: number;
  energy: number;
  focus: number;
  spirit: number;
  calendar: number;
  progress: number;
  progressTarget: number;
  cycle: number;
  choice: ScenarioChoice | null;
  activePriority: string;
  priorityRemaining: number;
  event: { kind: 'none' | 'termRush' | 'daily' | 'weekly'; phase: 'idle' | 'telegraph' | 'active'; remaining: number };
  climax: { phase: 'none' | 'telegraph' | 'active'; progress: number; target: number };
  masterPath: {
    year: 1 | 2 | 3;
    stage: 'coursework-onboarding' | 'research-project' | 'proposal' | 'finish-defense';
    supervisorPersonId: PersonId | null;
    careerPlan: CareerPlan | null;
    proposal: { phase: 'none' | 'preparation' | 'rehearsal' | 'presentation' | 'complete'; progress: number; target: number };
  } | null;
  workPath: {
    stage: WorkStage;
    managerId: ManagerId | null;
    marketStrength: number;
    experience: number;
    careerTime: number;
    conversionScore: number;
    promotionProgress: number;
  } | null;
  completed: boolean;
  gameOver: boolean;
}

export interface ScenarioSimulationStateV1 {
  rngState: number; nextId: number; time: number; spawnTimer: number; shotTimer: number;
  eventAt: number; eventPhase: ScenarioSnapshot['event']['phase']; eventRemaining: number; eventKind: ScenarioSnapshot['event']['kind']; nextChoiceAt: number;
  climaxPhase: ScenarioSnapshot['climax']['phase']; climaxProgress: number; climaxBossSpawned: boolean;
  completed: boolean; gameOver: boolean; defeated: number;
  energy: number; focus: number; spirit: number; calendar: number; progress: number; choice: ScenarioChoice | null;
  masterSupervisor: PersonId | null; masterCareerPlan: CareerPlan | null;
  masterProposalPhase: NonNullable<ScenarioSnapshot['masterPath']>['proposal']['phase']; masterProposalRemaining: number; masterProposalProgress: number; masterProposalRosterInitialized: boolean;
  workStage: WorkStage; managerId: ManagerId | null; marketStrength: number; experience: number; careerTime: number; workConversionScore: number; promotionProgress: number;
  conversionChoiceShown: boolean; nextMarketAt: number; nextConversionAt: number; nextClimaxAt: number;
  relationships?: Partial<Record<StablePersonId, RelationshipStateV1>>;
  activePriority: string; priorityRemaining: number;
  enemies: ScenarioEnemy[]; projectiles: ScenarioProjectile[]; pickups: ScenarioPickup[]; player: ScenarioSnapshot['player'];
}

const CONFIG = {
  master: {
    eventAt: 13, eventEvery: 17, choiceAt: 7, choiceEvery: 18, climaxAt: 88,
    ambient: ['courseBlock', 'deadline'] as const, boss: 'exam' as const,
    progressTarget: 70, cycleSeconds: 15,
  },
  work: {
    eventAt: 7, eventEvery: 9, choiceAt: 5, choiceEvery: 13, climaxAt: 58,
    ambient: ['request', 'notification'] as const, boss: 'delivery' as const,
    progressTarget: 78, cycleSeconds: 9,
  },
} as const;

export class ScenarioSimulation {
  private readonly rng: SeededRng;
  private readonly config: typeof CONFIG[ScenarioWorld];
  private nextId = 1;
  private time = 0;
  private spawnTimer = 0;
  private shotTimer = 0;
  private eventAt: number;
  private eventPhase: ScenarioSnapshot['event']['phase'] = 'idle';
  private eventRemaining = 0;
  private eventKind: ScenarioSnapshot['event']['kind'] = 'none';
  private nextChoiceAt: number;
  private climaxPhase: ScenarioSnapshot['climax']['phase'] = 'none';
  private climaxProgress = 0;
  private climaxBossSpawned = false;
  private completed = false;
  private gameOver = false;
  private defeated = 0;
  private energy = 100;
  private focus = 100;
  private spirit = 100;
  private calendar = 8;
  private progress = 0;
  private choice: ScenarioChoice | null = null;
  private masterSupervisor: PersonId | null = null;
  private masterCareerPlan: CareerPlan | null = null;
  private masterProposalPhase: NonNullable<ScenarioSnapshot['masterPath']>['proposal']['phase'] = 'none';
  private masterProposalRemaining = 0;
  private masterProposalProgress = 0;
  private masterProposalRosterInitialized = false;
  private workStage: WorkStage = 'offers';
  private managerId: ManagerId | null = null;
  private marketStrength = .5;
  private experience = 0;
  private careerTime = 0;
  private workConversionScore = 0;
  private promotionProgress = 0;
  private conversionChoiceShown = false;
  private relationships: Partial<Record<StablePersonId, RelationshipStateV1>> = {};
  private nextMarketAt = 18;
  private nextConversionAt = 28;
  private nextClimaxAt: number;
  private activePriority = '◆';
  private priorityRemaining = 0;
  private enemies: ScenarioEnemy[] = [];
  private projectiles: ScenarioProjectile[] = [];
  private pickups: ScenarioPickup[] = [];
  private player = { x: 640, y: 360, hp: 140, maxHp: 140, radius: 18, invulnerable: 0 };
  private readonly automaticOffense: boolean;
  private readonly damageEnabled: boolean;

  constructor(readonly world: ScenarioWorld, seed = 0x51ce2026, private readonly difficulty: RunningDifficulty = 'garden', options: { automaticOffense?: boolean; damageEnabled?: boolean; restore?: ScenarioSimulationStateV1 } = {}) {
    this.config = CONFIG[world];
    this.rng = createRng(seed, options.restore?.rngState);
    this.automaticOffense = options.automaticOffense ?? true;
    this.damageEnabled = options.damageEnabled ?? true;
    this.eventAt = this.config.eventAt;
    this.nextChoiceAt = this.config.choiceAt;
    this.nextClimaxAt = this.config.climaxAt;
    if (options.restore) {
      this.restore(options.restore);
      return;
    }
    if (world === 'master') this.choice = { kind: 'masterSupervisor', options: ['mei', 'rowan', 'lin'] };
    else {
      this.marketStrength = seededMarketStrength(this.rng);
      this.choice = { kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] };
    }
  }

  step(dt: number, input: RunningInput): void {
    if (dt <= 0 || dt > 0.1 || this.choice || this.completed || this.gameOver) return;
    this.time += dt;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.priorityRemaining = Math.max(0, this.priorityRemaining - dt);
    this.move(dt, input);
    if (this.world === 'master') this.updateMasterPath(dt);
    else this.updateWorkPath(dt);
    this.updatePressure(dt);
    this.updateEvent(dt);
    this.updateClimax(dt);
    if (this.climaxPhase === 'none' && this.time >= this.nextClimaxAt) this.beginClimax();
    if (this.climaxPhase === 'none' && !this.choice && this.time >= this.nextChoiceAt && this.masterProposalPhase === 'none') this.openChoice();
    this.spawnTimer -= dt;
    const proposalOwnsArena = this.world === 'master' && this.masterProposalPhase !== 'none' && this.masterProposalPhase !== 'complete';
    if (this.climaxPhase === 'none' && !proposalOwnsArena && this.spawnTimer <= 0) {
      const kind = this.config.ambient[this.defeated % this.config.ambient.length];
      this.spawn(kind, undefined, 'ambient');
      const protecting = this.world === 'work' && this.activePriority === '▣' && this.priorityRemaining > 0;
      this.spawnTimer = adjustSpawnInterval((this.world === 'master' ? 0.82 : 0.64) * (protecting ? 1.45 : 1), this.difficulty);
    }
    this.shotTimer -= dt;
    if (this.automaticOffense && this.shotTimer <= 0 && this.enemies.length) {
      this.fire();
      this.shotTimer = Math.max(0.24, (this.world === 'master' ? 0.62 : 0.54) * (1.18 - this.focus / 400));
    }
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    if (this.automaticOffense) this.updateOrbit(dt);
    this.collect();
  }

  choose(option: string): boolean {
    if (!this.choice || !this.choice.options.includes(option as never)) return false;
    const choiceKind = this.choice.kind;
    if (this.choice.kind === 'masterSupervisor') {
      this.masterSupervisor = option as PersonId;
      const relationship = this.relationshipFor(this.masterSupervisor);
      const role = masterRoleOutcome(this.masterSupervisor, relationship, this.currentSituation(), this.rng.next());
      this.focus = bound(this.focus + role.signal * .22);
      this.calendar = bound(this.calendar + role.assignmentPressure * 8);
      this.spirit = bound(this.spirit - role.noise * .18);
      this.setRelationship(this.masterSupervisor, updateRelationship(relationship, { trust: relationship.trust + (role.signal - role.noise) / 180, reciprocity: relationship.reciprocity + role.opportunitySupport * .03 }));
    } else if (this.choice.kind === 'careerPlan') {
      this.masterCareerPlan = option as CareerPlan;
      this.nextClimaxAt = Math.max(this.nextClimaxAt, this.time + 12);
      if (option === 'researchPhd') { this.focus = bound(this.focus - 7); this.progress += 7; }
      else if (option === 'employment') { this.energy = bound(this.energy - 6); this.experience += 9; }
      else { this.spirit = bound(this.spirit + 7); this.calendar = bound(this.calendar + 3); }
    } else if (this.choice.kind === 'workOffer') {
      const baseOffer = WORK_OFFERS.find((item) => item.id === option)!;
      const offer = effectiveWorkOffer(baseOffer, this.marketStrength, this.experience);
      this.managerId = offer.managerId;
      const manager = MANAGERS[this.managerId];
      const relationship = this.relationshipFor(manager.personId);
      const behavior = managerPersonBehavior(this.managerId, relationship, this.currentSituation(), this.rng.next());
      this.workStage = 'trial';
      this.activePriority = offer.environment === 'fast' ? '⚡' : offer.environment === 'structured' ? '▣' : '◇';
      this.calendar = bound(this.calendar + offer.pressure * 12);
      // An offer's viable opportunity affects the starting clarity of the trial; the
      // baseline onboarding cost keeps this meaningful even from a full Focus bar.
      this.focus = bound(this.focus - 6 + offerViability(offer, this.marketStrength, this.experience) * 8);
      this.focus = bound(this.focus + behavior.signal * 3 - behavior.noise * 2);
      this.setRelationship(manager.personId, updateRelationship(relationship, { trust: relationship.trust + behavior.signal * .025 - behavior.noise * .02 }));
      this.nextChoiceAt = this.time + 5;
      this.nextConversionAt = this.time + 28;
    } else if (this.choice.kind === 'workConversion') {
      if (option === 'continue') {
        this.workStage = this.workConversionScore >= .42 ? 'employed' : 'trial';
        this.calendar = bound(this.calendar + 8);
        if (this.workStage === 'trial') {
          this.conversionChoiceShown = false;
          this.nextConversionAt = this.time + 18;
        }
      } else {
        // Switching is possible but costs scarce Career Time, Calendar, Energy and Spirit.
        this.workStage = 'offers';
        this.managerId = null;
        this.careerTime += 12;
        this.calendar = bound(this.calendar + 15);
        this.energy = bound(this.energy - 10);
        this.spirit = bound(this.spirit - 7);
        this.marketStrength = seededMarketStrength(this.rng, this.marketStrength);
        this.choice = { kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] };
        this.conversionChoiceShown = false;
        return true;
      }
    } else if (this.choice.kind === 'masterTrack') {
      const index = this.choice.options.indexOf(option as never);
      this.activePriority = ['▦', '◆', '◇', '★'][index];
      this.energy = bound(this.energy - [10, 16, 13, 18][index]);
      this.focus = bound(this.focus - [15, 11, 9, 17][index]);
      this.calendar = bound(this.calendar + [16, 12, 18, 20][index]);
      this.progress = Math.min(this.config.progressTarget, this.progress + [9, 13, 10, 15][index]);
    } else if (option === 'protectFocus') {
      this.activePriority = '▣';
      this.priorityRemaining = 13;
      this.focus = bound(this.focus + 13);
      this.calendar = bound(this.calendar + 3);
      this.spirit = bound(this.spirit + 4);
    } else {
      this.activePriority = '⚡';
      this.priorityRemaining = 13;
      this.progress = Math.min(this.config.progressTarget, this.progress + 15);
      this.energy = bound(this.energy - 15);
      this.focus = bound(this.focus - 10);
      this.calendar = bound(this.calendar + 20);
      for (let index = 0; index < 4; index += 1) this.spawn('request', index / 4 * Math.PI * 2, 'periodic');
    }
    this.choice = null;
    this.nextChoiceAt = choiceKind === 'masterSupervisor' ? this.config.choiceAt
      : choiceKind === 'workOffer' ? this.time + 5
        : this.time + this.config.choiceEvery;
    return true;
  }

  startReview(scene: 'dense' | 'event' | 'choice' | 'climax' | 'complete'): void {
    if (scene === 'dense') {
      this.defeated = 24;
      for (let index = 0; index < 18; index += 1) this.spawn(this.config.ambient[index % 2], index / 18 * Math.PI * 2, 'ambient');
    } else if (scene === 'event') {
      this.eventAt = 0;
      this.updateEvent(0);
    } else if (scene === 'choice') this.openChoice();
    else if (scene === 'climax') this.beginClimax();
    else {
      this.completed = true;
      this.progress = this.config.progressTarget;
    }
  }

  startChoiceReview(kind: 'careerPlan' | 'workOffer' | 'workConversion' | 'workPriority'): void {
    if (kind === 'careerPlan' && this.world === 'master') this.choice = { kind: 'careerPlan', options: ['researchPhd', 'employment', 'undecided'] };
    else if (kind === 'workOffer' && this.world === 'work') this.choice = { kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] };
    else if (kind === 'workConversion' && this.world === 'work') this.choice = { kind: 'workConversion', options: ['continue', 'leaveSearch'] };
    else if (kind === 'workPriority' && this.world === 'work') this.choice = { kind: 'workPriority', options: ['protectFocus', 'acceptRush'] };
  }

  defeatDesignatedTargetForReview(id: number): boolean {
    const target = this.enemies.find((enemy) => enemy.id === id && (enemy.source === 'milestone' || enemy.source === 'climax'));
    if (!target) return false;
    target.hp = 0;
    this.removeDefeated();
    return true;
  }

  /** Deterministic review/test seam: ordinary interruption counts must not become career authority. */
  recordOrdinaryDefeatsForReview(count: number): void {
    this.defeated += Math.max(0, Math.round(count));
  }

  startMasterPathReview(year: 1 | 2 | 3, careerPlan: CareerPlan | null = null): void {
    if (this.world !== 'master') return;
    this.choice = null;
    this.masterSupervisor = 'mei';
    this.time = year === 1 ? 8 : year === 2 ? 36 : 68;
    this.masterCareerPlan = careerPlan;
    this.masterProposalPhase = year === 3 ? 'complete' : 'none';
  }

  startWorkPathReview(stage: WorkStage, marketStrength: number): void {
    if (this.world !== 'work') return;
    this.choice = null;
    this.managerId = 'clear-builder';
    this.workStage = stage;
    this.marketStrength = Math.max(.2, Math.min(.8, marketStrength));
    this.experience = stage === 'offers' ? 0 : stage === 'trial' ? 12 : stage === 'conversion' ? 25 : 48;
    if (stage === 'offers') { this.managerId = null; this.choice = { kind: 'workOffer', options: ['offer-a', 'offer-b', 'offer-c'] }; }
    if (stage === 'conversion') this.choice = { kind: 'workConversion', options: ['continue', 'leaveSearch'] };
    if (stage === 'promotion') { this.promotionProgress = 100; this.completed = true; }
  }

  snapshot(): ScenarioSnapshot {
    return {
      world: this.world, difficulty: this.difficulty, time: this.time, player: { ...this.player },
      enemies: this.enemies.map((item) => ({ ...item })), projectiles: this.projectiles.map((item) => ({ ...item })), pickups: this.pickups.map((item) => ({ ...item })),
      orbitCount: this.world === 'work' ? Math.min(6, 1 + Math.floor(this.progress / 20)) : Math.min(6, 1 + Math.floor(this.defeated / 8)), defeated: this.defeated,
      energy: this.energy, focus: this.focus, spirit: this.spirit, calendar: this.calendar,
      progress: this.progress, progressTarget: this.config.progressTarget,
      cycle: Math.min(this.world === 'master' ? 4 : 7, Math.floor(this.time / this.config.cycleSeconds) + 1),
      choice: this.choice ? { ...this.choice, options: [...this.choice.options] } as ScenarioChoice : null,
      activePriority: this.activePriority,
      priorityRemaining: this.priorityRemaining,
      event: { kind: this.eventKind, phase: this.eventPhase, remaining: this.eventRemaining },
      climax: { phase: this.climaxPhase, progress: this.climaxProgress, target: this.world === 'master' ? 5 : 16 },
      masterPath: this.world === 'master' ? {
        year: this.time < 30 ? 1 : this.time < 60 ? 2 : 3,
        stage: this.time < 30 ? 'coursework-onboarding' : this.time < 55 ? 'research-project' : this.masterProposalPhase !== 'complete' ? 'proposal' : 'finish-defense',
        supervisorPersonId: this.masterSupervisor,
        careerPlan: this.masterCareerPlan,
        proposal: { phase: this.masterProposalPhase, progress: this.masterProposalProgress, target: 6 },
      } : null,
      workPath: this.world === 'work' ? {
        stage: this.workStage, managerId: this.managerId, marketStrength: this.marketStrength,
        experience: this.experience, careerTime: this.careerTime,
        conversionScore: this.workConversionScore, promotionProgress: this.promotionProgress,
      } : null,
      completed: this.completed, gameOver: this.gameOver,
    };
  }

  exportState(): ScenarioSimulationStateV1 {
    return {
      rngState: this.rng.state(), nextId: this.nextId, time: this.time, spawnTimer: this.spawnTimer, shotTimer: this.shotTimer,
      eventAt: this.eventAt, eventPhase: this.eventPhase, eventRemaining: this.eventRemaining, eventKind: this.eventKind, nextChoiceAt: this.nextChoiceAt,
      climaxPhase: this.climaxPhase, climaxProgress: this.climaxProgress, climaxBossSpawned: this.climaxBossSpawned,
      completed: this.completed, gameOver: this.gameOver, defeated: this.defeated, energy: this.energy, focus: this.focus, spirit: this.spirit,
      calendar: this.calendar, progress: this.progress, choice: this.choice ? { ...this.choice, options: [...this.choice.options] } as ScenarioChoice : null,
      masterSupervisor: this.masterSupervisor, masterCareerPlan: this.masterCareerPlan, masterProposalPhase: this.masterProposalPhase,
      masterProposalRemaining: this.masterProposalRemaining, masterProposalProgress: this.masterProposalProgress, masterProposalRosterInitialized: this.masterProposalRosterInitialized,
      workStage: this.workStage, managerId: this.managerId, marketStrength: this.marketStrength, experience: this.experience, careerTime: this.careerTime,
      workConversionScore: this.workConversionScore, promotionProgress: this.promotionProgress, conversionChoiceShown: this.conversionChoiceShown,
      nextMarketAt: this.nextMarketAt, nextConversionAt: this.nextConversionAt, nextClimaxAt: this.nextClimaxAt,
      relationships: Object.fromEntries(Object.entries(this.relationships).map(([id, relationship]) => [id, cloneRelationship(relationship)])),
      activePriority: this.activePriority, priorityRemaining: this.priorityRemaining, enemies: this.enemies.map((item) => ({ ...item, flash: 0 })),
      projectiles: this.projectiles.map((item) => ({ ...item })), pickups: this.pickups.map((item) => ({ ...item })), player: { ...this.player },
    };
  }

  private restore(state: ScenarioSimulationStateV1): void {
    this.nextId = state.nextId; this.time = state.time; this.spawnTimer = state.spawnTimer; this.shotTimer = state.shotTimer;
    this.eventAt = state.eventAt; this.eventPhase = state.eventPhase; this.eventRemaining = state.eventRemaining; this.eventKind = state.eventKind; this.nextChoiceAt = state.nextChoiceAt;
    this.climaxPhase = state.climaxPhase; this.climaxProgress = state.climaxProgress; this.climaxBossSpawned = state.climaxBossSpawned;
    this.completed = state.completed; this.gameOver = state.gameOver; this.defeated = state.defeated; this.energy = state.energy; this.focus = state.focus;
    this.spirit = state.spirit; this.calendar = state.calendar; this.progress = state.progress;
    this.choice = state.choice ? { ...state.choice, options: [...state.choice.options] } as ScenarioChoice : null;
    this.masterSupervisor = state.masterSupervisor; this.masterCareerPlan = state.masterCareerPlan; this.masterProposalPhase = state.masterProposalPhase;
    this.masterProposalRemaining = state.masterProposalRemaining; this.masterProposalProgress = state.masterProposalProgress; this.masterProposalRosterInitialized = state.masterProposalRosterInitialized;
    this.workStage = state.workStage; this.managerId = state.managerId; this.marketStrength = state.marketStrength; this.experience = state.experience; this.careerTime = state.careerTime;
    this.workConversionScore = state.workConversionScore; this.promotionProgress = state.promotionProgress; this.conversionChoiceShown = state.conversionChoiceShown;
    this.relationships = Object.fromEntries(Object.entries(state.relationships ?? {}).map(([id, relationship]) => [id, cloneRelationship(relationship)]));
    this.nextMarketAt = state.nextMarketAt; this.nextConversionAt = state.nextConversionAt; this.nextClimaxAt = state.nextClimaxAt;
    this.activePriority = state.activePriority; this.priorityRemaining = state.priorityRemaining;
    this.enemies = state.enemies.map((item) => ({ ...item })); this.projectiles = state.projectiles.map((item) => ({ ...item }));
    this.pickups = state.pickups.map((item) => ({ ...item })); this.player = { ...state.player };
  }

  private move(dt: number, input: RunningInput): void {
    const length = Math.hypot(input.x, input.y);
    const scale = length > 1 ? 1 / length : 1;
    const speed = 220 * (0.72 + this.energy / 360);
    this.player.x = clamp(this.player.x + input.x * scale * speed * dt, 18, RUNNING_WORLD.width - 18);
    this.player.y = clamp(this.player.y + input.y * scale * speed * dt, 18, RUNNING_WORLD.height - 18);
  }

  private updateMasterPath(dt: number): void {
    if (this.time >= 55 && this.masterProposalPhase === 'none') {
      this.choice = null;
      this.masterProposalPhase = 'preparation';
      this.masterProposalRemaining = 5;
      this.energy = bound(this.energy - 7);
      this.focus = bound(this.focus - 8);
    }
    if (this.masterProposalPhase === 'preparation' || this.masterProposalPhase === 'rehearsal') {
      this.masterProposalRemaining -= dt;
      if (this.masterProposalRemaining <= 0 && this.masterProposalPhase === 'preparation') {
        this.masterProposalPhase = 'rehearsal';
        this.masterProposalRemaining = 2.5;
        this.focus = bound(this.focus + 4);
      } else if (this.masterProposalRemaining <= 0 && this.masterProposalPhase === 'rehearsal') {
        this.masterProposalPhase = 'presentation';
      }
    }
    if (this.masterProposalPhase === 'presentation' && !this.masterProposalRosterInitialized) {
      this.enemies = [];
      this.projectiles = [];
      for (let index = 0; index < 6; index += 1) {
        this.spawn(index % 3 === 0 ? 'exam' : 'courseBlock', index / 6 * Math.PI * 2, 'milestone');
      }
      this.masterProposalRosterInitialized = true;
    }
    if (this.masterProposalPhase === 'complete' && this.time >= 64 && !this.masterCareerPlan && !this.choice) {
      this.choice = { kind: 'careerPlan', options: ['researchPhd', 'employment', 'undecided'] };
    }
  }

  private updateWorkPath(dt: number): void {
    if (this.workStage === 'offers' || !this.managerId) return;
    this.careerTime += dt;
    this.experience = Math.min(100, this.experience + (this.workStage === 'trial' ? .16 : .1) * dt);
    if (this.time >= this.nextMarketAt) {
      this.marketStrength = seededMarketStrength(this.rng, this.marketStrength);
      this.nextMarketAt = this.time + 18;
    }
    const manager = MANAGERS[this.managerId];
    const relationship = this.relationshipFor(manager.personId);
    // Continuous scoring must not advance the authoritative RNG every frame.
    // Random variation is sampled only at discrete offers and role interactions.
    const behavior = managerPersonBehavior(this.managerId, relationship, this.currentSituation(), .5);
    // Genuine work Progress is the career authority. Ordinary interruption kills
    // remain pressure handling and cannot farm conversion or promotion.
    const performance = Math.min(1, this.progress / 80);
    this.workConversionScore = conversionScore(this.managerId, performance, (this.energy + this.focus) / 200, behavior);
    this.calendar = bound(this.calendar + manager.volatility * .05 * dt);
    if (this.workStage === 'trial' && this.time >= this.nextConversionAt && !this.conversionChoiceShown) {
      this.choice = { kind: 'workConversion', options: ['continue', 'leaveSearch'] };
      this.workStage = 'conversion';
      this.conversionChoiceShown = true;
    }
    if (this.workStage === 'employed') {
      this.promotionProgress = Math.min(100, this.promotionProgress + (performance + behavior.supportOpportunity * .45) * dt);
      if (this.promotionProgress >= 100) {
        this.workStage = 'promotion';
        this.completed = true;
      }
    }
  }

  private updatePressure(dt: number): void {
    const intensity = this.world === 'master' ? 0.34 : 0.46;
    const protecting = this.world === 'work' && this.activePriority === '▣' && this.priorityRemaining > 0;
    const rushing = this.world === 'work' && this.activePriority === '⚡' && this.priorityRemaining > 0;
    this.energy = bound(this.energy - (intensity * (0.4 + this.calendar / 120) + (rushing ? 0.62 : 0)) * dt);
    this.focus = bound(this.focus + (protecting ? 0.34 : -intensity * (0.35 + this.enemies.length / 40) - (rushing ? 0.48 : 0)) * dt);
    this.spirit = bound(this.spirit + (0.09 - this.calendar / 850) * dt);
    this.calendar = bound(this.calendar + (this.world === 'master' ? 0.16 : protecting ? 0.08 : rushing ? 0.52 : 0.24) * dt);
    if (protecting) this.progress = Math.min(this.config.progressTarget, this.progress + 0.24 * dt);
  }

  private updateEvent(dt: number): void {
    if (this.world === 'master' && this.masterProposalPhase !== 'none' && this.masterProposalPhase !== 'complete') {
      this.eventPhase = 'idle';
      this.eventKind = 'none';
      this.eventRemaining = 0;
      this.eventAt = this.time + this.config.eventEvery;
      return;
    }
    if (this.eventPhase === 'idle' && this.time >= this.eventAt) {
      this.eventKind = this.world === 'master' ? 'termRush' : (Math.floor(this.time / this.config.eventEvery) % 3 === 2 ? 'weekly' : 'daily');
      this.eventPhase = 'telegraph';
      this.eventRemaining = adjustTelegraphDuration(this.eventKind === 'weekly' ? 3 : 2, this.difficulty);
    } else if (this.eventPhase === 'telegraph') {
      this.eventRemaining -= dt;
      if (this.eventRemaining <= 0) {
        this.eventPhase = 'active';
        const count = this.eventKind === 'weekly' ? 12 : this.world === 'master' ? 8 : 4;
        for (let index = 0; index < count; index += 1) this.spawn(this.world === 'master' ? 'courseBlock' : (this.eventKind === 'weekly' ? 'request' : 'notification'), index / count * Math.PI * 2, 'periodic');
        this.calendar = bound(this.calendar + (this.eventKind === 'weekly' ? 18 : 9));
        this.applyRoleInteraction();
        this.eventRemaining = this.eventKind === 'weekly' ? 6 : 4;
      }
    } else if (this.eventPhase === 'active') {
      this.eventRemaining -= dt;
      if (this.eventRemaining <= 0) {
        this.eventPhase = 'idle';
        this.eventKind = 'none';
        this.eventAt = this.time + this.config.eventEvery;
      }
    }
  }

  private applyRoleInteraction(): void {
    if (this.world === 'master' && this.masterSupervisor) {
      const relationship = this.relationshipFor(this.masterSupervisor);
      const role = masterRoleOutcome(this.masterSupervisor, relationship, this.currentSituation(), this.rng.next());
      this.focus = bound(this.focus + role.signal * .08);
      this.spirit = bound(this.spirit - role.noise * .06 + role.opportunitySupport * 1.4);
      this.calendar = bound(this.calendar + role.assignmentPressure * 2.5);
      this.setRelationship(this.masterSupervisor, updateRelationship(relationship, { trust: relationship.trust + (role.signal - role.noise) / 260, reciprocity: relationship.reciprocity + role.opportunitySupport * .018 }));
    } else if (this.world === 'work' && this.managerId) {
      const manager = MANAGERS[this.managerId];
      const relationship = this.relationshipFor(manager.personId);
      const behavior = managerPersonBehavior(this.managerId, relationship, this.currentSituation(), this.rng.next());
      this.focus = bound(this.focus + behavior.signal * 3 - behavior.noise * 2.5);
      this.calendar = bound(this.calendar + behavior.requestPressure * 4);
      this.spirit = bound(this.spirit + behavior.supportOpportunity * 2 - behavior.noise * 1.5);
      this.setRelationship(manager.personId, updateRelationship(relationship, { trust: relationship.trust + behavior.signal * .025 - behavior.noise * .025, unresolvedConflict: relationship.unresolvedConflict + behavior.noise * .02 - behavior.supportOpportunity * .015 }));
    }
  }

  private currentSituation(): SituationState {
    return { workload: this.calendar / 100, pressure: Math.max(0, Math.min(1, this.enemies.length / 32)), scarcity: 1 - (this.energy + this.focus) / 200, stakes: this.climaxPhase === 'none' ? (this.world === 'work' ? Math.min(1, this.careerTime / 90) : Math.min(1, this.time / 90)) : 1 };
  }

  private relationshipFor(id: StablePersonId): RelationshipStateV1 { return cloneRelationship(this.relationships[id] ?? defaultRelationship()); }
  private setRelationship(id: StablePersonId, relationship: RelationshipStateV1): void { this.relationships[id] = relationship; }

  private beginClimax(): void {
    const masterReady = this.world !== 'master' || (this.masterProposalPhase === 'complete' && this.masterCareerPlan !== null);
    const workReady = this.world !== 'work' || this.workStage === 'employed';
    if (!masterReady || !workReady) {
      this.nextClimaxAt = this.time + 5;
      return;
    }
    this.choice = null;
    this.climaxPhase = 'telegraph';
    this.eventPhase = 'idle';
    this.eventKind = 'none';
    this.eventRemaining = adjustTelegraphDuration(3, this.difficulty);
    this.climaxProgress = 0;
    this.climaxBossSpawned = false;
    this.enemies = [];
    this.projectiles = [];
  }

  private updateClimax(dt: number): void {
    if (this.climaxPhase === 'telegraph') {
      this.eventRemaining -= dt;
      if (this.eventRemaining <= 0) this.climaxPhase = 'active';
    }
    if (this.climaxPhase === 'active' && !this.climaxBossSpawned) {
      this.climaxBossSpawned = true;
      const count = this.world === 'master' ? 5 : 1;
      for (let index = 0; index < count; index += 1) {
        this.spawn(this.world === 'master' && index > 0 ? 'courseBlock' : this.config.boss, index / count * Math.PI * 2, 'climax');
      }
    }
  }

  private openChoice(): void {
    this.choice = this.world === 'master'
      ? { kind: 'masterTrack', options: ['coursework', 'project', 'internship', 'jobSearch'] }
      : { kind: 'workPriority', options: ['protectFocus', 'acceptRush'] };
  }

  private spawn(kind: ScenarioEnemyKind, angle = this.rng.next() * Math.PI * 2, source: ScenarioEnemy['source']): void {
    if (this.enemies.length >= MAX_RUNNING_ENEMIES) {
      if (source === 'ambient') return;
      const ambient = this.enemies.findIndex((enemy) => enemy.source === 'ambient');
      if (ambient < 0) return;
      this.enemies.splice(ambient, 1);
    }
    const point = placeSpawnAtDistance(this.player, angle, source === 'climax' ? 390 : 360 + this.rng.next() * 70);
    const boss = kind === 'exam' || kind === 'delivery';
    this.enemies.push({ id: this.nextId++, kind, x: point.x, y: point.y, hp: boss ? 170 : kind === 'courseBlock' || kind === 'request' ? 34 : 22, radius: boss ? 42 : kind === 'courseBlock' || kind === 'request' ? 24 : 18, source, flash: 0 });
  }

  private fire(): void {
    const target = this.enemies.reduce((best, enemy) => distance2(enemy, this.player) < distance2(best, this.player) ? enemy : best);
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.projectiles.push({ id: this.nextId++, x: this.player.x, y: this.player.y, vx: dx / length * 520, vy: dy / length * 520, damage: 18, radius: 5, ttl: 1.5 });
  }

  private updateProjectiles(dt: number): void {
    const alive: ScenarioProjectile[] = [];
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.ttl -= dt;
      let hit = false;
      for (const enemy of this.enemies) {
        if (!hit && touch(projectile, enemy)) { enemy.hp -= projectile.damage; enemy.flash = 0.08; hit = true; }
      }
      if (!hit && projectile.ttl > 0) alive.push(projectile);
    }
    this.projectiles = alive;
    this.removeDefeated();
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const boss = enemy.kind === 'exam' || enemy.kind === 'delivery';
      const speed = boss ? 38 : enemy.kind === 'notification' ? 118 : 70;
      enemy.x += dx / length * adjustEnemySpeed(speed, this.difficulty) * dt;
      enemy.y += dy / length * adjustEnemySpeed(speed, this.difficulty) * dt;
      if (this.damageEnabled && touch(this.player, enemy) && this.player.invulnerable <= 0) {
        this.player.hp -= adjustEnemyDamage(boss ? 22 : enemy.kind === 'notification' ? 7 : 11, this.difficulty);
        this.player.invulnerable = 0.65;
        this.calendar = bound(this.calendar + (enemy.kind === 'notification' ? 12 : 6));
        this.focus = bound(this.focus - (enemy.kind === 'notification' ? 10 : 5));
        if (this.player.hp <= 0) this.gameOver = true;
      }
    }
  }

  private updateOrbit(dt: number): void {
    const count = Math.min(6, 1 + Math.floor(this.defeated / 8));
    for (let index = 0; index < count; index += 1) {
      const angle = this.time * 2.2 + index / count * Math.PI * 2;
      const node = { x: this.player.x + Math.cos(angle) * 64, y: this.player.y + Math.sin(angle) * 64, radius: 9 };
      for (const enemy of this.enemies) if (touch(node, enemy)) enemy.hp -= 15 * dt;
    }
    this.removeDefeated();
  }

  private removeDefeated(): void {
    const alive: ScenarioEnemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) alive.push(enemy);
      else {
        this.defeated += 1;
        if (enemy.source === 'milestone' && this.world === 'master' && this.masterProposalPhase === 'presentation') {
          this.masterProposalProgress += 1;
          if (this.masterProposalProgress >= 6) {
            this.masterProposalPhase = 'complete';
            this.enemies = alive;
          }
        }
        const progressGain = enemy.source === 'climax' ? 12 : this.world === 'master' ? 2 : 0;
        this.progress = Math.min(this.config.progressTarget, this.progress + progressGain);
        if (this.climaxPhase === 'active' && enemy.source === 'climax') {
          this.climaxProgress += this.world === 'master' ? 1 : 16;
          if (this.world === 'work' && this.workStage === 'employed') this.promotionProgress = Math.min(100, this.promotionProgress + 35);
        }
        this.pickups.push({ id: this.nextId++, x: enemy.x, y: enemy.y, value: 5, radius: 8 });
      }
    }
    this.enemies = alive;
    const target = this.world === 'master' ? 5 : 16;
    if (this.climaxPhase === 'active' && this.climaxProgress >= target) {
      if (this.world === 'master') this.completed = true;
      else {
        this.climaxPhase = 'none';
        this.nextClimaxAt = this.time + 30;
      }
    }
  }

  private collect(): void {
    const remaining: ScenarioPickup[] = [];
    for (const pickup of this.pickups) {
      if (touch(this.player, pickup)) {
        this.energy = bound(this.energy + 2);
        this.spirit = bound(this.spirit + 2);
      } else remaining.push(pickup);
    }
    this.pickups = remaining;
  }
}

function touch(a: Vec2 & { radius: number }, b: Vec2 & { radius: number }): boolean {
  const radius = a.radius + b.radius;
  return distance2(a, b) <= radius * radius;
}

function distance2(a: Vec2, b: Vec2): number { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
function bound(value: number): number { return clamp(value, 0, 100); }
