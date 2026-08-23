import { createRng, type SeededRng } from './rng';
import { PhdSystems, resourceModifiers, type PhdSnapshot, type PhdSystemsStateV1 } from './phdSystems';
import { academicCandidatesForSeed } from './people';
import { adjustEnemyDamage, adjustEnemySpeed, adjustSpawnInterval, adjustTelegraphDuration, type RunningDifficulty } from './difficulty';

export const RUNNING_WORLD = { width: 1280, height: 720 } as const;
export const MAX_RUNNING_ENEMIES = 64;

export interface Vec2 { x: number; y: number }
export interface RunningInput { x: number; y: number }
export type UpgradeId = 'orbit' | 'cadence' | 'vitality';
export type EnemyKind = 'mite' | 'reviewer' | 'chair' | 'phone' | 'committee';

export interface Enemy extends Vec2 {
  id: number;
  kind: EnemyKind;
  hp: number;
  radius: number;
  flash: number;
  source: 'ambient' | 'meeting' | 'milestone';
}

export interface Projectile extends Vec2 {
  id: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  ttl: number;
}

export interface Pickup extends Vec2 { id: number; value: number; radius: number }
export interface HitPulse extends Vec2 { id: number; ttl: number; color: number }
export interface OrbitContact extends Vec2 { nodeIndex: number; enemyX: number; enemyY: number; defeated: boolean }
export interface RunningSimulationOptions {
  initialPlayer?: Vec2;
  firstMeetingAt?: number;
  difficulty?: RunningDifficulty;
  automaticOffense?: boolean;
  restore?: RunningSimulationStateV1;
}

export interface RunningSimulationStateV1 {
  rngState: number;
  nextId: number;
  spawnTimer: number;
  shotTimer: number;
  meetingAt: number;
  meetingPhase: 'idle' | 'telegraph' | 'active';
  meetingRemaining: number;
  meetingCount: number;
  milestoneRosterInitialized: boolean;
  enemies: Enemy[];
  projectiles: Projectile[];
  pickups: Pickup[];
  hitPulses: HitPulse[];
  upgrades: Record<UpgradeId, number>;
  player: RunningSnapshot['player'];
  time: number;
  level: number;
  xp: number;
  upgradePending: boolean;
  defeated: number;
  gameOver: boolean;
  phd: PhdSystemsStateV1;
}

export interface RunningSnapshot {
  difficulty: RunningDifficulty;
  time: number;
  player: Vec2 & { hp: number; maxHp: number; radius: number; invulnerable: number };
  enemies: readonly Enemy[];
  projectiles: readonly Projectile[];
  pickups: readonly Pickup[];
  hitPulses: readonly HitPulse[];
  orbitContacts: readonly OrbitContact[];
  level: number;
  xp: number;
  xpNeeded: number;
  orbitCount: number;
  upgradePending: boolean;
  meeting: { phase: 'idle' | 'telegraph' | 'active'; remaining: number; count: number };
  defeated: number;
  gameOver: boolean;
  phd: PhdSnapshot;
}

const PLAYER_SPEED = 250;
const PLAYER_RADIUS = 18;

export class RunningSimulation {
  private readonly rng: SeededRng;
  private nextId = 1;
  private spawnTimer = 0;
  private shotTimer = 0;
  private meetingAt = 28;
  private meetingPhase: 'idle' | 'telegraph' | 'active' = 'idle';
  private meetingRemaining = 0;
  private meetingCount = 0;
  private milestoneRosterInitialized = false;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private hitPulses: HitPulse[] = [];
  private orbitContacts: OrbitContact[] = [];
  private upgrades: Record<UpgradeId, number> = { orbit: 0, cadence: 0, vitality: 0 };
  private player = {
    x: RUNNING_WORLD.width / 2,
    y: RUNNING_WORLD.height / 2,
    hp: 140,
    maxHp: 140,
    radius: PLAYER_RADIUS,
    invulnerable: 0,
  };
  private time = 0;
  private level = 1;
  private xp = 0;
  private upgradePending = false;
  private defeated = 0;
  private gameOver = false;
  private readonly phd: PhdSystems;
  private readonly difficulty: RunningDifficulty;
  private readonly automaticOffense: boolean;

  constructor(seed = 0xbea72026, options: RunningSimulationOptions = {}) {
    this.rng = createRng(seed, options.restore?.rngState);
    this.difficulty = options.difficulty ?? 'garden';
    this.phd = new PhdSystems({ milestoneTimingScale: this.difficulty === 'sprout' ? 1.2 : this.difficulty === 'storm' ? .78 : 1, supervisorCandidates: academicCandidatesForSeed(seed), ...(options.restore ? { restore: options.restore.phd } : {}) });
    this.automaticOffense = options.automaticOffense ?? true;
    if (options.restore) {
      this.restore(options.restore);
      return;
    }
    if (options.initialPlayer) {
      this.player.x = clamp(options.initialPlayer.x, PLAYER_RADIUS, RUNNING_WORLD.width - PLAYER_RADIUS);
      this.player.y = clamp(options.initialPlayer.y, PLAYER_RADIUS, RUNNING_WORLD.height - PLAYER_RADIUS);
    }
    if (options.firstMeetingAt !== undefined) this.meetingAt = Math.max(0, options.firstMeetingAt);
  }

  step(dt: number, input: RunningInput): void {
    this.orbitContacts = [];
    const phdState = this.phd.snapshot();
    if (dt <= 0 || dt > 0.1 || this.gameOver || phdState.terminal === 'ended' || phdState.terminal === 'graduated' || (this.upgradePending && !phdState.milestone) || phdState.choice) return;
    this.time += dt;
    this.phd.step(this.time, dt);
    if (this.phd.snapshot().choice) return;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.movePlayer(dt, input);
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + resourceModifiers(this.phd.snapshot()).healthRecovery * dt);
    this.updateMeeting(dt);
    this.updateMilestoneArena(dt);
    this.spawnTimer -= dt;
    if (!this.phd.snapshot().milestone && this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = adjustSpawnInterval(Math.max(0.4, 1.2 - this.time * 0.007), this.difficulty);
    }
    this.shotTimer -= dt;
    if (this.automaticOffense && this.shotTimer <= 0 && this.enemies.length > 0) {
      this.fireAtNearest();
      const modifiers = resourceModifiers(this.phd.snapshot());
      this.shotTimer = Math.max(0.22, (0.72 - this.upgrades.cadence * 0.1) * modifiers.shotCadence);
    }
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    if (this.automaticOffense) this.updateOrbitDamage(dt);
    this.collectPickups();
    this.hitPulses = this.hitPulses
      .map((pulse) => ({ ...pulse, ttl: pulse.ttl - dt }))
      .filter((pulse) => pulse.ttl > 0);
  }

  chooseUpgrade(id: UpgradeId): boolean {
    if (!this.upgradePending) return false;
    this.upgrades[id] += 1;
    if (id === 'vitality') {
      this.player.maxHp += 24;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 34);
    }
    this.upgradePending = false;
    return true;
  }

  choosePhdOption(option: string): boolean {
    return this.phd.choose(option, this.time);
  }

  startMilestoneReview(kind: 'qualifying' | 'defense'): void {
    this.phd.startReviewMilestone(kind);
  }

  /** Deterministic review/test seam: defeat one designated target without timing shots. */
  defeatMilestoneTargetForReview(id: number): boolean {
    const target = this.enemies.find((enemy) => enemy.id === id && enemy.source === 'milestone');
    if (!target) return false;
    target.hp = 0;
    this.removeDefeated();
    return true;
  }

  startChoiceReview(kind: 'supervisor' | 'lifestyle' | 'recovery'): void {
    this.phd.startReviewChoice(kind);
  }

  startSupervisorFeedbackReview(id: 'supportive' | 'controlling' | 'handsOff'): void {
    this.phd.startReviewChoice('supervisor');
    this.phd.choose(id, this.time);
    this.phd.onMeeting(this.rng.next());
  }

  startSceneReview(scene: ReviewScene): void {
    if (scene === 'dense') {
      this.upgrades.orbit = 3;
      for (let index = 0; index < 18; index += 1) this.spawnEnemy(index % 6 === 0 ? 'reviewer' : 'mite', index / 18 * Math.PI * 2);
    } else if (scene === 'meeting') {
      this.meetingPhase = 'telegraph';
      this.meetingRemaining = adjustTelegraphDuration(3, this.difficulty);
      this.meetingAt = Number.POSITIVE_INFINITY;
    } else if (scene === 'phone') {
      this.spawnEnemy('phone', 0);
    } else if (scene === 'thesisSeed' || scene === 'thesisSapling' || scene === 'thesisTree' || scene === 'thesisBloom') {
      this.phd.startReviewThesisStage({ thesisSeed: 'seed', thesisSapling: 'sapling', thesisTree: 'tree', thesisBloom: 'bloom' }[scene] as PhdSnapshot['thesisStage']);
    } else if (scene === 'seasonBefore' || scene === 'seasonAfter') {
      this.phd.startReviewYear(scene === 'seasonBefore' ? 1 : 2, scene === 'seasonAfter');
    } else if (scene === 'annual1' || scene === 'annual2' || scene === 'annual3' || scene === 'annual4') {
      this.phd.startReviewAnnualMilestone(Number(scene.slice(-1)));
    } else if (scene === 'year9End' || scene === 'graduated') {
      this.phd.startReviewTerminal(scene === 'year9End' ? 'ended' : 'graduated');
    } else {
      this.phd.startReviewProgression(scene);
      this.upgrades.orbit = scene === 'thesis' ? 3 : 4;
    }
  }

  snapshot(): RunningSnapshot {
    return {
      difficulty: this.difficulty,
      time: this.time,
      player: { ...this.player },
      enemies: this.enemies.map((item) => ({ ...item })),
      projectiles: this.projectiles.map((item) => ({ ...item })),
      pickups: this.pickups.map((item) => ({ ...item })),
      hitPulses: this.hitPulses.map((item) => ({ ...item })),
      orbitContacts: this.orbitContacts.map((item) => ({ ...item })),
      level: this.level,
      xp: this.xp,
      xpNeeded: this.xpNeeded(),
      orbitCount: 1 + this.upgrades.orbit,
      upgradePending: this.upgradePending,
      meeting: { phase: this.meetingPhase, remaining: this.meetingRemaining, count: this.meetingCount },
      defeated: this.defeated,
      gameOver: this.gameOver,
      phd: this.phd.snapshot(),
    };
  }

  exportState(): RunningSimulationStateV1 {
    return {
      rngState: this.rng.state(), nextId: this.nextId, spawnTimer: this.spawnTimer, shotTimer: this.shotTimer,
      meetingAt: Number.isFinite(this.meetingAt) ? this.meetingAt : 1e9, meetingPhase: this.meetingPhase, meetingRemaining: this.meetingRemaining,
      meetingCount: this.meetingCount, milestoneRosterInitialized: this.phd.snapshot().milestone?.phase === 'presentation' && this.milestoneRosterInitialized,
      enemies: this.enemies.map((item) => ({ ...item, flash: 0 })), projectiles: this.projectiles.map((item) => ({ ...item })),
      pickups: this.pickups.map((item) => ({ ...item })), hitPulses: [],
      upgrades: { ...this.upgrades }, player: { ...this.player }, time: this.time, level: this.level, xp: this.xp,
      upgradePending: this.upgradePending, defeated: this.defeated, gameOver: this.gameOver, phd: this.phd.exportState(),
    };
  }

  private restore(state: RunningSimulationStateV1): void {
    this.nextId = state.nextId; this.spawnTimer = state.spawnTimer; this.shotTimer = state.shotTimer;
    this.meetingAt = state.meetingAt; this.meetingPhase = state.meetingPhase; this.meetingRemaining = state.meetingRemaining;
    this.meetingCount = state.meetingCount; this.milestoneRosterInitialized = state.milestoneRosterInitialized;
    this.enemies = state.enemies.map((item) => ({ ...item })); this.projectiles = state.projectiles.map((item) => ({ ...item }));
    this.pickups = state.pickups.map((item) => ({ ...item })); this.hitPulses = state.hitPulses.map((item) => ({ ...item }));
    this.upgrades = { ...state.upgrades }; this.player = { ...state.player }; this.time = state.time; this.level = state.level;
    this.xp = state.xp; this.upgradePending = state.upgradePending; this.defeated = state.defeated; this.gameOver = state.gameOver;
  }

  private movePlayer(dt: number, input: RunningInput): void {
    const length = Math.hypot(input.x, input.y);
    const scale = length > 1 ? 1 / length : 1;
    const speed = PLAYER_SPEED * resourceModifiers(this.phd.snapshot()).moveSpeed;
    this.player.x = clamp(this.player.x + input.x * scale * speed * dt, PLAYER_RADIUS, RUNNING_WORLD.width - PLAYER_RADIUS);
    this.player.y = clamp(this.player.y + input.y * scale * speed * dt, PLAYER_RADIUS, RUNNING_WORLD.height - PLAYER_RADIUS);
  }

  private updateMeeting(dt: number): void {
    if (!this.phd.snapshot().supervisorId) return;
    if (this.phd.snapshot().milestone) {
      // Major reviews own the arena. Rebase recurring meetings so a meeting ring
      // can never leak into the finite Qualifying/Defense roster.
      this.meetingPhase = 'idle';
      this.meetingRemaining = 0;
      this.meetingAt = this.time + 42;
      return;
    }
    if (this.meetingPhase === 'idle' && this.time >= this.meetingAt) {
      this.meetingPhase = 'telegraph';
      this.meetingRemaining = adjustTelegraphDuration(3, this.difficulty);
      return;
    }
    if (this.meetingPhase === 'telegraph') {
      this.meetingRemaining -= dt;
      if (this.meetingRemaining <= 0) {
        this.meetingPhase = 'active';
        this.meetingRemaining = 9;
        this.meetingCount += 1;
        this.phd.onMeeting(this.rng.next());
        this.spawnMeetingRing();
      }
      return;
    }
    if (this.meetingPhase === 'active') {
      this.meetingRemaining -= dt;
      if (this.meetingRemaining <= 0) {
        this.meetingPhase = 'idle';
        this.meetingAt = this.time + 42;
      }
    }
  }

  private spawnEnemy(kind?: EnemyKind, angle?: number, source: Enemy['source'] = 'ambient'): void {
    if (this.enemies.length >= MAX_RUNNING_ENEMIES) {
      if (source === 'ambient') return;
      const ambient = this.enemies.findIndex((enemy) => enemy.source === 'ambient');
      if (ambient < 0) return;
      this.enemies.splice(ambient, 1);
    }
    const sideAngle = angle ?? this.rng.next() * Math.PI * 2;
    const distance = 360 + this.rng.next() * 90;
    const roll = this.rng.next();
    const supervisorId = this.phd.snapshot().supervisorId;
    const phoneChance = supervisorId === 'controlling' ? 0.18 : supervisorId === 'handsOff' ? 0.035 : 0.075;
    const chosen = kind ?? (this.time > 35 && roll < phoneChance ? 'phone' : this.time > 45 && roll < 0.23 ? 'reviewer' : 'mite');
    const stats = chosen === 'reviewer'
      ? { hp: 34, radius: 21 }
      : chosen === 'phone'
        ? { hp: 24, radius: 18 }
      : chosen === 'committee'
        ? { hp: 190, radius: 42 }
      : chosen === 'chair'
        ? { hp: 65, radius: 28 }
        : { hp: 14, radius: 14 };
    this.enemies.push({
      id: this.nextId++, kind: chosen,
      ...placeSpawnAtDistance(this.player, sideAngle, distance),
      ...stats, flash: 0, source,
    });
  }

  private spawnMeetingRing(): void {
    for (let index = 0; index < 10; index += 1) {
      this.spawnEnemy(index % 5 === 0 ? 'chair' : 'reviewer', (index / 10) * Math.PI * 2, 'meeting');
    }
  }

  private updateMilestoneArena(_dt: number): void {
    const milestone = this.phd.snapshot().milestone;
    if (milestone?.phase !== 'presentation') {
      this.milestoneRosterInitialized = false;
      return;
    }
    if (this.milestoneRosterInitialized) return;

    // A major milestone is one finite, legible roster. Ambient/meeting entities are
    // cleared at entry and never count as designated targets; nothing replenishes a
    // defeated reviewer or committee member while the player takes their time.
    this.enemies = [];
    this.projectiles = [];
    for (let index = 0; index < milestone.target; index += 1) {
      const angle = (index / milestone.target) * Math.PI * 2;
      let kind: EnemyKind;
      if (milestone.kind === 'qualifying') {
        const stanceEvery = milestone.stance === 'adversarial' ? 3 : milestone.stance === 'support' ? 6 : 4;
        const chairEvery = this.difficulty === 'storm' ? Math.max(2, stanceEvery - 1) : this.difficulty === 'sprout' ? stanceEvery + 1 : stanceEvery;
        kind = index % chairEvery === 0 ? 'chair' : 'reviewer';
      } else {
        kind = index === 0 ? 'committee' : index % 2 === 0 ? 'chair' : 'reviewer';
      }
      this.spawnEnemy(kind, angle, 'milestone');
    }
    this.milestoneRosterInitialized = true;
  }

  private fireAtNearest(): void {
    let target = this.enemies[0];
    let best = Number.POSITIVE_INFINITY;
    for (const enemy of this.enemies) {
      const distance = distanceSquared(this.player, enemy);
      if (distance < best) { best = distance; target = enemy; }
    }
    if (!target) return;
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    this.projectiles.push({
      id: this.nextId++, x: this.player.x, y: this.player.y,
      vx: Math.cos(angle) * 520, vy: Math.sin(angle) * 520,
      radius: 6, damage: 14 * resourceModifiers(this.phd.snapshot()).projectileDamage, ttl: 1.5,
    });
  }

  private updateProjectiles(dt: number): void {
    const alive: Projectile[] = [];
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.ttl -= dt;
      let hit = false;
      for (const enemy of this.enemies) {
        if (circlesTouch(projectile, enemy)) {
          enemy.hp -= projectile.damage;
          enemy.flash = 0.12;
          this.hitPulses.push({ id: this.nextId++, x: enemy.x, y: enemy.y, ttl: 0.18, color: 0xf9f29f });
          hit = true;
          break;
        }
      }
      if (!hit && projectile.ttl > 0) alive.push(projectile);
    }
    this.projectiles = alive;
    this.removeDefeated();
  }

  private updateEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      const speed = enemy.kind === 'mite' ? 92 : enemy.kind === 'phone' ? 112 : enemy.kind === 'reviewer' ? 66 : enemy.kind === 'committee' ? 34 : 48;
      enemy.x += Math.cos(angle) * adjustEnemySpeed(speed, this.difficulty) * dt;
      enemy.y += Math.sin(angle) * adjustEnemySpeed(speed, this.difficulty) * dt;
      if (this.player.invulnerable <= 0 && circlesTouch(this.player, enemy)) {
        const damage = enemy.kind === 'committee' ? 24 : enemy.kind === 'chair' ? 18 : enemy.kind === 'reviewer' ? 12 : enemy.kind === 'phone' ? 6 : 8;
        if (enemy.kind === 'phone') this.phd.onInterruption();
        const arenaScale = this.phd.snapshot().milestone?.damageScale ?? 1;
        this.player.hp -= adjustEnemyDamage(damage * arenaScale, this.difficulty);
        this.player.invulnerable = 0.9;
        this.hitPulses.push({ id: this.nextId++, x: this.player.x, y: this.player.y, ttl: 0.3, color: 0xff766e });
        if (this.player.hp <= 0) this.gameOver = true;
      }
    }
  }

  private updateOrbitDamage(dt: number): void {
    const count = 1 + this.upgrades.orbit;
    for (let index = 0; index < count; index += 1) {
      const angle = this.time * 2.2 + (index / count) * Math.PI * 2;
      const node = { x: this.player.x + Math.cos(angle) * 64, y: this.player.y + Math.sin(angle) * 64, radius: 9 };
      for (const enemy of this.enemies) {
        if (circlesTouch(node, enemy)) {
          enemy.hp -= 16 * resourceModifiers(this.phd.snapshot()).orbitDamage * dt;
          if (enemy.hp <= 0 || !this.orbitContacts.some((contact) => contact.nodeIndex === index)) {
            this.orbitContacts.push({ nodeIndex: index, x: node.x, y: node.y, enemyX: enemy.x, enemyY: enemy.y, defeated: enemy.hp <= 0 });
          }
        }
      }
    }
    this.removeDefeated();
  }

  private removeDefeated(): void {
    const alive: Enemy[] = [];
    for (const enemy of this.enemies) {
      if (enemy.hp > 0) alive.push(enemy);
      else {
        this.defeated += 1;
        this.phd.onDefeated(1, enemy.source === 'milestone');
        this.pickups.push({ id: this.nextId++, x: enemy.x, y: enemy.y, value: enemy.kind === 'mite' ? 4 : enemy.kind === 'phone' ? 7 : enemy.kind === 'reviewer' ? 9 : enemy.kind === 'committee' ? 30 : 16, radius: 8 });
        this.hitPulses.push({ id: this.nextId++, x: enemy.x, y: enemy.y, ttl: 0.35, color: 0x73f2aa });
      }
    }
    this.enemies = alive;
  }

  private collectPickups(): void {
    const remaining: Pickup[] = [];
    for (const pickup of this.pickups) {
      const distance = Math.sqrt(distanceSquared(this.player, pickup));
      const pickupRadius = 500 * resourceModifiers(this.phd.snapshot()).pickupRadius;
      if (distance < pickupRadius) {
        const pull = Math.min(1, 0.1 + (pickupRadius - distance) / Math.max(1, pickupRadius - 70));
        pickup.x += (this.player.x - pickup.x) * pull;
        pickup.y += (this.player.y - pickup.y) * pull;
      }
      if (circlesTouch(this.player, pickup)) {
        this.xp += pickup.value;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + pickup.value * 0.28);
      } else remaining.push(pickup);
    }
    this.pickups = remaining;
    if (this.xp >= this.xpNeeded()) {
      this.xp -= this.xpNeeded();
      this.level += 1;
      this.upgradePending = true;
    }
  }

  private xpNeeded(): number { return 22 + (this.level - 1) * 18; }
}

export type ReviewScene =
  | 'dense' | 'meeting' | 'phone' | 'thesis' | 'defenseGate' | 'year9'
  | 'thesisSeed' | 'thesisSapling' | 'thesisTree' | 'thesisBloom'
  | 'seasonBefore' | 'seasonAfter'
  | 'annual1' | 'annual2' | 'annual3' | 'annual4'
  | 'year9End' | 'graduated';

function circlesTouch(a: Vec2 & { radius: number }, b: Vec2 & { radius: number }): boolean {
  const radius = a.radius + b.radius;
  return distanceSquared(a, b) <= radius * radius;
}

function distanceSquared(a: Vec2, b: Vec2): number {
  const x = a.x - b.x;
  const y = a.y - b.y;
  return x * x + y * y;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Spawns may begin outside the world so boundary/corner placement never collapses
 * the promised warning distance. Enemies then approach the bounded player normally.
 */
export function placeSpawnAtDistance(player: Vec2, angle: number, distance: number): Vec2 {
  return {
    x: player.x + Math.cos(angle) * distance,
    y: player.y + Math.sin(angle) * distance,
  };
}
