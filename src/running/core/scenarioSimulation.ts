import { createRng, type SeededRng } from './rng';
import { RUNNING_WORLD, placeSpawnAtDistance, type RunningInput, type Vec2 } from './simulation';
import { adjustEnemyDamage, adjustEnemySpeed, adjustSpawnInterval, adjustTelegraphDuration, type RunningDifficulty } from './difficulty';

export type ScenarioWorld = 'master' | 'work';
export type ScenarioEnemyKind = 'courseBlock' | 'deadline' | 'exam' | 'request' | 'notification' | 'delivery';
export type ScenarioChoice =
  | { kind: 'masterTrack'; options: readonly ['coursework', 'project', 'internship', 'jobSearch'] }
  | { kind: 'workPriority'; options: readonly ['protectFocus', 'acceptRush'] };

export interface ScenarioEnemy extends Vec2 {
  id: number;
  kind: ScenarioEnemyKind;
  hp: number;
  radius: number;
  source: 'ambient' | 'periodic' | 'climax';
  flash: number;
}

interface ScenarioProjectile extends Vec2 { id: number; vx: number; vy: number; damage: number; radius: number; ttl: number }
interface ScenarioPickup extends Vec2 { id: number; value: number; radius: number }

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
  completed: boolean;
  gameOver: boolean;
}

const CONFIG = {
  master: {
    eventAt: 13, eventEvery: 17, choiceAt: 7, choiceEvery: 18, climaxAt: 52,
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
  private activePriority = '◆';
  private priorityRemaining = 0;
  private enemies: ScenarioEnemy[] = [];
  private projectiles: ScenarioProjectile[] = [];
  private pickups: ScenarioPickup[] = [];
  private player = { x: 640, y: 360, hp: 140, maxHp: 140, radius: 18, invulnerable: 0 };

  constructor(readonly world: ScenarioWorld, seed = 0x51ce2026, private readonly difficulty: RunningDifficulty = 'garden') {
    this.config = CONFIG[world];
    this.rng = createRng(seed);
    this.eventAt = this.config.eventAt;
    this.nextChoiceAt = this.config.choiceAt;
  }

  step(dt: number, input: RunningInput): void {
    if (dt <= 0 || dt > 0.1 || this.choice || this.completed || this.gameOver) return;
    this.time += dt;
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.priorityRemaining = Math.max(0, this.priorityRemaining - dt);
    this.move(dt, input);
    this.updatePressure(dt);
    this.updateEvent(dt);
    this.updateClimax(dt);
    if (this.climaxPhase === 'none' && this.time >= this.config.climaxAt) this.beginClimax();
    if (this.climaxPhase === 'none' && this.time >= this.nextChoiceAt) this.openChoice();
    this.spawnTimer -= dt;
    if (this.climaxPhase === 'none' && this.spawnTimer <= 0) {
      const kind = this.config.ambient[this.defeated % this.config.ambient.length];
      this.spawn(kind, undefined, 'ambient');
      const protecting = this.world === 'work' && this.activePriority === '▣' && this.priorityRemaining > 0;
      this.spawnTimer = adjustSpawnInterval((this.world === 'master' ? 0.82 : 0.64) * (protecting ? 1.45 : 1), this.difficulty);
    }
    this.shotTimer -= dt;
    if (this.shotTimer <= 0 && this.enemies.length) {
      this.fire();
      this.shotTimer = Math.max(0.24, (this.world === 'master' ? 0.62 : 0.54) * (1.18 - this.focus / 400));
    }
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateOrbit(dt);
    this.collect();
  }

  choose(option: string): boolean {
    if (!this.choice || !this.choice.options.includes(option as never)) return false;
    if (this.choice.kind === 'masterTrack') {
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
    this.nextChoiceAt = this.time + this.config.choiceEvery;
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
      climax: { phase: this.climaxPhase, progress: this.climaxProgress, target: this.world === 'master' ? 12 : 16 },
      completed: this.completed, gameOver: this.gameOver,
    };
  }

  private move(dt: number, input: RunningInput): void {
    const length = Math.hypot(input.x, input.y);
    const scale = length > 1 ? 1 / length : 1;
    const speed = 220 * (0.72 + this.energy / 360);
    this.player.x = clamp(this.player.x + input.x * scale * speed * dt, 18, RUNNING_WORLD.width - 18);
    this.player.y = clamp(this.player.y + input.y * scale * speed * dt, 18, RUNNING_WORLD.height - 18);
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

  private beginClimax(): void {
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
      this.spawn(this.config.boss, 0, 'climax');
    }
  }

  private openChoice(): void {
    this.choice = this.world === 'master'
      ? { kind: 'masterTrack', options: ['coursework', 'project', 'internship', 'jobSearch'] }
      : { kind: 'workPriority', options: ['protectFocus', 'acceptRush'] };
  }

  private spawn(kind: ScenarioEnemyKind, angle = this.rng.next() * Math.PI * 2, source: ScenarioEnemy['source']): void {
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
      if (touch(this.player, enemy) && this.player.invulnerable <= 0) {
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
        const progressGain = enemy.source === 'climax' ? 12 : this.world === 'master' ? 2 : 0;
        this.progress = Math.min(this.config.progressTarget, this.progress + progressGain);
        if (this.climaxPhase === 'active' && enemy.source === 'climax') this.climaxProgress += this.world === 'master' ? 12 : 16;
        this.pickups.push({ id: this.nextId++, x: enemy.x, y: enemy.y, value: 5, radius: 8 });
      }
    }
    this.enemies = alive;
    const target = this.world === 'master' ? 12 : 16;
    if (this.climaxPhase === 'active' && this.climaxProgress >= target) this.completed = true;
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
