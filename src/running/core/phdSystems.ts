export type ProjectId = 'replication' | 'riskyIdea' | 'helping' | 'prestige';
export type ThesisStage = 'seed' | 'sapling' | 'tree' | 'bloom';
export type PhdChoice =
  | { kind: 'project'; options: readonly ProjectId[] }
  | { kind: 'qualifying'; options: readonly ['attempt', 'defer'] }
  | { kind: 'defense'; options: readonly ['attempt', 'defer'] };

export interface MilestoneArena {
  kind: 'qualifying' | 'defense';
  phase: 'telegraph' | 'active';
  remaining: number;
  progress: number;
  target: number;
  damageScale: number;
}

export interface MentorVector {
  expertise: number;
  resources: number;
  clarity: number;
  autonomySupport: number;
  emotionalSafety: number;
  boundaryRespect: number;
  stability: number;
  projectMatch: number;
}

export interface PhdSnapshot {
  energy: number;
  focus: number;
  spirit: number;
  calendarLoad: number;
  signal: number;
  noise: number;
  pollution: number;
  logic: number;
  clarity: number;
  boundary: number;
  purpose: number;
  connection: number;
  evidence: number;
  year: number;
  seasonPulse: number;
  annualReviews: number;
  activeProject: { id: ProjectId; progress: number; goal: number } | null;
  completedProjects: number;
  thesisStage: ThesisStage;
  qualifying: 'locked' | 'ready' | 'passed';
  defense: 'hidden' | 'visible' | 'ready' | 'passed';
  choice: PhdChoice | null;
  milestone: MilestoneArena | null;
  graduated: boolean;
  terminal: 'ongoing' | 'finalYear' | 'ended' | 'graduated';
}

const DEFAULT_MENTOR: MentorVector = {
  expertise: 0.86, resources: 0.65, clarity: 0.7, autonomySupport: 0.42,
  emotionalSafety: 0.48, boundaryRespect: 0.4, stability: 0.58, projectMatch: 0.76,
};

const PROJECTS: Record<ProjectId, {
  energy: number; focus: number; calendar: number; goal: number;
  rewards: Partial<Record<'logic' | 'clarity' | 'boundary' | 'purpose' | 'connection' | 'evidence', number>>;
}> = {
  replication: { energy: 16, focus: 12, calendar: 12, goal: 26, rewards: { logic: 8, evidence: 9 } },
  riskyIdea: { energy: 13, focus: 18, calendar: 10, goal: 30, rewards: { purpose: 11, clarity: 5 } },
  helping: { energy: 17, focus: 8, calendar: 15, goal: 24, rewards: { connection: 12, boundary: 4 } },
  prestige: { energy: 22, focus: 16, calendar: 22, goal: 34, rewards: { evidence: 8, connection: 6 } },
};

export class PhdSystems {
  private state: PhdSnapshot = {
    energy: 100, focus: 100, spirit: 100, calendarLoad: 8,
    signal: 0, noise: 0, pollution: 0,
    logic: 20, clarity: 20, boundary: 20, purpose: 20, connection: 20, evidence: 12,
    year: 1, seasonPulse: 0, annualReviews: 0, activeProject: null, completedProjects: 0,
    thesisStage: 'seed', qualifying: 'locked', defense: 'hidden', choice: null, milestone: null,
    graduated: false, terminal: 'ongoing',
  };
  private nextProjectAt = 12;
  private nextQualifyingPrompt = 0;
  private nextDefensePrompt = 0;
  private contributions = new Set<ProjectId>();

  constructor(options: { initialResources?: Partial<Pick<PhdSnapshot, 'energy' | 'focus' | 'spirit'>> } = {}) {
    if (options.initialResources) {
      if (options.initialResources.energy !== undefined) this.state.energy = bound(options.initialResources.energy);
      if (options.initialResources.focus !== undefined) this.state.focus = bound(options.initialResources.focus);
      if (options.initialResources.spirit !== undefined) this.state.spirit = bound(options.initialResources.spirit);
    }
  }

  step(time: number, dt: number): void {
    if (this.state.graduated || this.state.terminal === 'ended' || this.state.choice) return;
    if (this.state.milestone) {
      this.stepMilestone(time, dt);
      return;
    }
    const rawYear = Math.floor(time / 45) + 1;
    if (rawYear > 9) {
      this.state.year = 9;
      this.state.terminal = 'ended';
      this.state.choice = null;
      this.state.milestone = null;
      this.state.calendarLoad = 100;
      this.state.pollution = bound(this.state.pollution + 18);
      return;
    }
    const year = rawYear;
    if (year > this.state.year) {
      this.state.year = year;
      this.state.seasonPulse = 4;
      this.applyAnnualReview(year);
    }
    if (year === 9) {
      this.state.terminal = 'finalYear';
      this.state.calendarLoad = bound(this.state.calendarLoad + 0.16 * dt);
      this.state.pollution = bound(this.state.pollution + 0.05 * dt);
    }
    this.state.seasonPulse = Math.max(0, this.state.seasonPulse - dt);
    const strain = this.state.calendarLoad / 100 + this.state.pollution / 160;
    this.state.energy = bound(this.state.energy + (0.55 - strain) * dt);
    this.state.focus = bound(this.state.focus + (0.48 - strain - this.state.noise / 240) * dt);
    this.state.spirit = bound(this.state.spirit + (0.34 - this.state.pollution / 120) * dt);
    this.state.calendarLoad = bound(this.state.calendarLoad - 0.08 * dt);
    this.state.pollution = bound(this.state.pollution - (0.035 + this.state.boundary / 5000) * dt);
    this.state.noise = bound(this.state.noise - 0.05 * dt);

    if (this.state.qualifying === 'ready' && time >= this.nextQualifyingPrompt) {
      this.state.choice = { kind: 'qualifying', options: ['attempt', 'defer'] };
      return;
    }
    if (this.state.defense === 'ready' && time >= this.nextDefensePrompt) {
      this.state.choice = { kind: 'defense', options: ['attempt', 'defer'] };
      return;
    }
    if (!this.state.activeProject && time >= this.nextProjectAt) {
      this.state.choice = { kind: 'project', options: ['replication', 'riskyIdea', 'helping', 'prestige'] };
    }
  }

  onDefeated(count = 1, milestoneEligible = true): void {
    if (milestoneEligible && this.state.milestone?.phase === 'active') {
      this.state.milestone.progress += count;
      if (this.state.milestone.progress >= this.state.milestone.target) this.passMilestone();
    }
    const project = this.state.activeProject;
    if (!project || this.state.choice) return;
    const focusFactor = resourceModifiers(this.state).projectEfficiency;
    project.progress = Math.min(project.goal, project.progress + count * 4 * focusFactor);
    if (project.progress >= project.goal) this.completeProject(project.id);
  }

  onMeeting(): void {
    const feedback = evaluateMentor(DEFAULT_MENTOR, {
      logic: this.state.logic, clarity: this.state.clarity, boundary: this.state.boundary,
      purpose: this.state.purpose, connection: this.state.connection, evidence: this.state.evidence,
    });
    this.state.signal = bound(this.state.signal + feedback.signal);
    this.state.noise = bound(this.state.noise + feedback.noise);
    this.state.focus = bound(this.state.focus + feedback.signal * 0.42);
    this.state.evidence = bound(this.state.evidence + feedback.signal * 0.18);
    this.state.pollution = bound(this.state.pollution + feedback.noise * (1 - this.state.purpose / 180));
    this.state.spirit = bound(this.state.spirit - feedback.noise * 0.32);
    this.state.calendarLoad = bound(this.state.calendarLoad + 7 * (1 - this.state.boundary / 150));
  }

  onInterruption(): void {
    const boundaryShield = Math.min(0.7, this.state.boundary / 120);
    this.state.calendarLoad = bound(this.state.calendarLoad + 11 * (1 - boundaryShield));
    this.state.noise = bound(this.state.noise + 8 * (1 - boundaryShield * 0.5));
    this.state.pollution = bound(this.state.pollution + 6 * (1 - this.state.purpose / 160));
    this.state.spirit = bound(this.state.spirit - 5 * (1 - this.state.connection / 180));
  }

  choose(option: string, time: number): boolean {
    const choice = this.state.choice;
    if (!choice || !choice.options.includes(option as never)) return false;
    if (choice.kind === 'project') this.startProject(option as ProjectId, time);
    else if (choice.kind === 'qualifying') this.resolveQualifying(option, time);
    else this.resolveDefense(option, time);
    return true;
  }

  startReviewMilestone(kind: 'qualifying' | 'defense'): void {
    this.state.choice = null;
    this.state.milestone = {
      kind, phase: 'telegraph', remaining: kind === 'qualifying' ? 3 : 4,
      progress: 0, target: kind === 'qualifying' ? 8 : 14,
      damageScale: kind === 'qualifying' ? 0.86 : 0.94,
    };
  }

  startReviewProgression(scene: 'thesis' | 'defenseGate' | 'year9'): void {
    this.contributions = new Set<ProjectId>(['replication', 'riskyIdea', 'helping']);
    this.state.completedProjects = scene === 'thesis' ? 3 : 6;
    this.state.qualifying = 'passed';
    this.state.year = scene === 'thesis' ? 4 : scene === 'defenseGate' ? 5 : 9;
    this.state.evidence = scene === 'thesis' ? 34 : 48;
    this.state.connection = scene === 'year9' ? 52 : 36;
    this.state.terminal = scene === 'year9' ? 'finalYear' : 'ongoing';
    this.updateMilestones();
    if (scene === 'defenseGate') this.state.defense = 'visible';
    this.state.choice = null;
  }

  startReviewThesisStage(stage: ThesisStage): void {
    const ids: ProjectId[] = ['replication', 'riskyIdea', 'helping'];
    const count = { seed: 0, sapling: 1, tree: 2, bloom: 3 }[stage];
    this.contributions = new Set<ProjectId>(ids.slice(0, count));
    this.state.completedProjects = count;
    this.state.year = Math.max(1, count + 1);
    this.state.qualifying = count >= 2 ? 'passed' : 'locked';
    this.updateMilestones();
    this.state.choice = null;
  }

  startReviewYear(year: number, pulse: boolean): void {
    this.state.year = Math.max(1, Math.min(9, Math.round(year)));
    this.state.terminal = this.state.year === 9 ? 'finalYear' : 'ongoing';
    this.state.seasonPulse = pulse ? 4 : 0;
    this.state.choice = null;
  }

  startReviewTerminal(terminal: 'ended' | 'graduated'): void {
    this.state.year = terminal === 'ended' ? 9 : 6;
    this.state.terminal = terminal;
    this.state.graduated = terminal === 'graduated';
    this.state.defense = terminal === 'graduated' ? 'passed' : this.state.defense;
    this.state.calendarLoad = terminal === 'ended' ? 100 : this.state.calendarLoad;
    this.state.choice = null;
    this.state.milestone = null;
  }

  snapshot(): PhdSnapshot {
    return {
      ...this.state,
      activeProject: this.state.activeProject ? { ...this.state.activeProject } : null,
      choice: this.state.choice ? { ...this.state.choice, options: [...this.state.choice.options] } as PhdChoice : null,
      milestone: this.state.milestone ? { ...this.state.milestone } : null,
    };
  }

  private startProject(id: ProjectId, time: number): void {
    const config = PROJECTS[id];
    const energyDebt = Math.max(0, config.energy - this.state.energy);
    const focusDebt = Math.max(0, config.focus - this.state.focus);
    this.state.energy = bound(this.state.energy - config.energy);
    this.state.focus = bound(this.state.focus - config.focus);
    this.state.calendarLoad = bound(this.state.calendarLoad + config.calendar + (energyDebt + focusDebt) * 1.1);
    this.state.pollution = bound(this.state.pollution + (energyDebt + focusDebt) * 0.65);
    this.state.spirit = bound(this.state.spirit - (energyDebt + focusDebt) * 0.55);
    this.state.activeProject = { id, progress: 0, goal: config.goal };
    this.state.choice = null;
    this.nextProjectAt = time + 18;
  }

  private completeProject(id: ProjectId): void {
    const config = PROJECTS[id];
    for (const [attribute, value] of Object.entries(config.rewards)) {
      const key = attribute as keyof typeof config.rewards;
      this.state[key] = bound(this.state[key] + (value ?? 0));
    }
    this.state.completedProjects += 1;
    this.contributions.add(id);
    this.state.activeProject = null;
    this.state.energy = bound(this.state.energy + 9);
    this.state.spirit = bound(this.state.spirit + 7);
    this.updateMilestones();
  }

  private applyAnnualReview(year: number): void {
    this.state.annualReviews += 1;
    this.state.calendarLoad = bound(this.state.calendarLoad + 8);
    if (this.state.activeProject) this.state.pollution = bound(this.state.pollution + 5);
    if (year >= 6) {
      this.state.evidence = bound(this.state.evidence + 3);
      this.state.connection = bound(this.state.connection + 2);
    }
    this.updateMilestones();
  }

  private updateMilestones(): void {
    const diversity = this.contributions.size;
    this.state.thesisStage = diversity >= 3 ? 'bloom' : diversity === 2 ? 'tree' : diversity === 1 ? 'sapling' : 'seed';
    if (this.state.qualifying === 'locked' && this.state.year >= 2 && this.state.completedProjects >= 2) {
      this.state.qualifying = 'ready';
    }
    if (this.state.year >= 5 && this.state.defense === 'hidden') this.state.defense = 'visible';
    if (this.state.defense === 'visible' && this.state.qualifying === 'passed' && this.state.thesisStage === 'bloom') {
      this.state.defense = 'ready';
    }
  }

  private resolveQualifying(option: string, time: number): void {
    this.state.choice = null;
    if (option === 'defer') { this.nextQualifyingPrompt = time + 22; return; }
    const readiness = this.state.logic + this.state.evidence + this.state.clarity;
    this.state.milestone = {
      kind: 'qualifying', phase: 'telegraph', remaining: 3, progress: 0,
      target: Math.max(7, 13 - Math.floor(readiness / 18)),
      damageScale: Math.max(0.62, 1.15 - this.state.evidence / 140),
    };
  }

  private resolveDefense(option: string, time: number): void {
    this.state.choice = null;
    if (option === 'defer') { this.nextDefensePrompt = time + 25; return; }
    this.state.milestone = {
      kind: 'defense', phase: 'telegraph', remaining: 4, progress: 0,
      target: Math.max(12, 22 - Math.floor(this.state.evidence / 7)),
      damageScale: Math.max(0.68, 1.2 - (this.state.evidence + this.state.spirit) / 220),
    };
  }

  private stepMilestone(time: number, dt: number): void {
    const milestone = this.state.milestone;
    if (!milestone) return;
    milestone.remaining -= dt;
    if (milestone.phase === 'telegraph' && milestone.remaining <= 0) {
      milestone.phase = 'active';
      milestone.remaining = milestone.kind === 'qualifying'
        ? 25 + this.state.clarity * 0.08
        : 38 + this.state.connection * 0.06;
      return;
    }
    if (milestone.phase === 'active' && milestone.remaining <= 0) {
      const kind = milestone.kind;
      this.state.milestone = null;
      this.state.spirit = bound(this.state.spirit - (kind === 'qualifying' ? 10 : 14));
      if (kind === 'qualifying') this.nextQualifyingPrompt = time + 20;
      else this.nextDefensePrompt = time + 24;
    }
  }

  private passMilestone(): void {
    const kind = this.state.milestone?.kind;
    if (!kind) return;
    this.state.milestone = null;
    if (kind === 'qualifying') {
      this.state.qualifying = 'passed';
      this.state.spirit = bound(this.state.spirit + 12);
      this.updateMilestones();
    } else {
      this.state.defense = 'passed';
      this.state.graduated = true;
      this.state.terminal = 'graduated';
    }
  }
}

export function resourceModifiers(resources: Pick<PhdSnapshot, 'energy' | 'focus' | 'spirit'>): {
  moveSpeed: number; shotCadence: number; projectileDamage: number; projectEfficiency: number; orbitDamage: number; pickupRadius: number; healthRecovery: number;
} {
  return {
    moveSpeed: 0.52 + resources.energy / 208,
    shotCadence: 1.45 - resources.focus / 222,
    projectileDamage: 0.58 + resources.focus / 238,
    projectEfficiency: 0.3 + resources.focus / 143,
    orbitDamage: 0.48 + resources.spirit / 192,
    pickupRadius: 0.55 + resources.spirit / 222,
    healthRecovery: 0.15 + resources.spirit / 118,
  };
}

export function evaluateMentor(
  mentor: MentorVector,
  player: Pick<PhdSnapshot, 'logic' | 'clarity' | 'boundary' | 'purpose' | 'connection' | 'evidence'>,
): { signal: number; noise: number } {
  const comprehension = 0.72 + (player.logic + player.clarity) / 500;
  const signalBase = mentor.expertise * 0.42 + mentor.resources * 0.13 + mentor.clarity * 0.2 + mentor.projectMatch * 0.25;
  const harmBase = (1 - mentor.emotionalSafety) * 0.34 + (1 - mentor.boundaryRespect) * 0.3 + (1 - mentor.stability) * 0.2 + (1 - mentor.autonomySupport) * 0.16;
  const protection = (player.boundary + player.purpose + player.connection + player.evidence) / 800;
  return {
    signal: Math.round(signalBase * comprehension * 16),
    noise: Math.round(harmBase * Math.max(0.35, 1 - protection) * 16),
  };
}

function bound(value: number): number { return Math.max(0, Math.min(100, value)); }
