import { ACADEMIC_PEOPLE, adaptAcademicPerson, type PersonId } from './people';

export type ProjectId = 'replication' | 'riskyIdea' | 'helping' | 'prestige';
export type ThesisStage = 'seed' | 'sapling' | 'tree' | 'bloom';
export type SupervisorId = 'supportive' | 'controlling' | 'handsOff';
export type LifestyleId = 'rest' | 'exercise' | 'social' | 'mindfulness' | 'weekendOvertime';
export type PhdChoice =
  | { kind: 'project'; options: readonly ProjectId[] }
  | { kind: 'supervisor'; options: readonly SupervisorId[] }
  | { kind: 'lifestyle'; options: readonly LifestyleId[] }
  | { kind: 'supervisorRequest'; options: readonly ['accept', 'setBoundary', 'decline'] }
  | { kind: 'qualifying'; options: readonly ['attempt', 'defer'] }
  | { kind: 'preDefense'; options: readonly ['attempt', 'defer'] }
  | { kind: 'defense'; options: readonly ['attempt', 'defer'] };

export type AnnualMilestoneKind = 'firstYearTalk' | 'proposal' | 'annualCommittee';

export interface MilestoneArena {
  kind: 'qualifying' | 'defense';
  stance: 'support' | 'mixed' | 'adversarial';
  phase: 'preparation' | 'rehearsal' | 'presentation';
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
  supervisorId: SupervisorId | null;
  supervisorPersonId: PersonId | null;
  supervisorFeedback: { signal: number; noise: number; remaining: number } | null;
  lifestyle: { id: LifestyleId; remaining: number } | null;
  activeProject: { id: ProjectId; progress: number; goal: number } | null;
  completedProjects: number;
  independentResearch: number;
  assignedLabor: number;
  supervisorRequests: number;
  lastBoundaryReaction: 'none' | 'respected' | 'strained';
  thesisStage: ThesisStage;
  qualifying: 'locked' | 'ready' | 'passed';
  annualMilestone: { kind: AnnualMilestoneKind; completedYear: number; remaining: number } | null;
  preDefense: 'hidden' | 'ready' | 'passed';
  revisionRemaining: number;
  defense: 'hidden' | 'visible' | 'ready' | 'passed';
  choice: PhdChoice | null;
  milestone: MilestoneArena | null;
  graduated: boolean;
  terminal: 'ongoing' | 'finalYear' | 'ended' | 'graduated';
}

export const SUPERVISOR_PERSON: Record<SupervisorId, PersonId> = {
  supportive: 'mei', controlling: 'rowan', handsOff: 'lin',
};

/** Compatibility/presentation vectors are derived from the shared Person authority. */
export function mentorVectorFor(personId: PersonId): MentorVector {
  const person = ACADEMIC_PEOPLE[personId];
  return {
    expertise: person.expertise, resources: person.resources, clarity: person.clarity,
    autonomySupport: person.autonomy, emotionalSafety: person.emotionalSafety,
    boundaryRespect: person.boundaryRespect, stability: person.stability,
    projectMatch: person.domainMatch,
  };
}

export const SUPPORTIVE_SUPERVISOR: MentorVector = mentorVectorFor('mei');
export const SUPERVISORS: Record<SupervisorId, MentorVector> = {
  supportive: mentorVectorFor(SUPERVISOR_PERSON.supportive),
  controlling: mentorVectorFor(SUPERVISOR_PERSON.controlling),
  handsOff: mentorVectorFor(SUPERVISOR_PERSON.handsOff),
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
    supervisorId: null, supervisorPersonId: null, supervisorFeedback: null, lifestyle: null,
    independentResearch: 0, assignedLabor: 0, supervisorRequests: 0, lastBoundaryReaction: 'none',
    thesisStage: 'seed', qualifying: 'locked', annualMilestone: null, preDefense: 'hidden', revisionRemaining: 0, defense: 'hidden', choice: null, milestone: null,
    graduated: false, terminal: 'ongoing',
  };
  private nextProjectAt = 12;
  private nextQualifyingPrompt = 0;
  private nextDefensePrompt = 0;
  private nextLifestyleAt = 68;
  private pausedAcademicTime = 0;
  private contributions = new Set<ProjectId>();

  private readonly milestoneTimingScale: number;

  constructor(options: { initialResources?: Partial<Pick<PhdSnapshot, 'energy' | 'focus' | 'spirit'>>; milestoneTimingScale?: number } = {}) {
    this.milestoneTimingScale = Math.max(.6, Math.min(1.4, options.milestoneTimingScale ?? 1));
    if (options.initialResources) {
      if (options.initialResources.energy !== undefined) this.state.energy = bound(options.initialResources.energy);
      if (options.initialResources.focus !== undefined) this.state.focus = bound(options.initialResources.focus);
      if (options.initialResources.spirit !== undefined) this.state.spirit = bound(options.initialResources.spirit);
    }
  }

  step(time: number, dt: number): void {
    if (this.state.graduated || this.state.terminal === 'ended' || this.state.choice) return;
    if (this.state.milestone) {
      this.pausedAcademicTime += dt;
      this.stepMilestone(dt);
      return;
    }
    const rawYear = Math.floor(Math.max(0, time - this.pausedAcademicTime) / 45) + 1;
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
      if (this.state.choice) return;
    }
    if (year === 9) {
      this.state.terminal = 'finalYear';
      this.state.calendarLoad = bound(this.state.calendarLoad + 0.16 * dt);
      this.state.pollution = bound(this.state.pollution + 0.05 * dt);
    }
    this.state.seasonPulse = Math.max(0, this.state.seasonPulse - dt);
    if (this.state.annualMilestone) {
      this.state.annualMilestone.remaining = Math.max(0, this.state.annualMilestone.remaining - dt);
      if (this.state.annualMilestone.remaining === 0) this.state.annualMilestone = null;
    }
    if (this.state.supervisorFeedback) {
      this.state.supervisorFeedback.remaining = Math.max(0, this.state.supervisorFeedback.remaining - dt);
      if (this.state.supervisorFeedback.remaining === 0) this.state.supervisorFeedback = null;
    }
    this.applyLifestyle(dt);
    if (this.state.revisionRemaining > 0) {
      this.state.revisionRemaining = Math.max(0, this.state.revisionRemaining - dt);
      this.state.focus = bound(this.state.focus - .18 * dt);
      this.state.evidence = bound(this.state.evidence + .22 * dt);
      this.state.clarity = bound(this.state.clarity + .18 * dt);
      if (this.state.revisionRemaining === 0) this.state.defense = 'ready';
    }
    const strain = this.state.calendarLoad / 100 + this.state.pollution / 160;
    this.state.energy = bound(this.state.energy + (0.55 - strain) * dt);
    this.state.focus = bound(this.state.focus + (0.48 - strain - this.state.noise / 240) * dt);
    this.state.spirit = bound(this.state.spirit + (0.34 - this.state.pollution / 120) * dt);
    this.state.calendarLoad = bound(this.state.calendarLoad - 0.08 * dt);
    this.state.pollution = bound(this.state.pollution - (0.035 + this.state.boundary / 5000) * dt);
    this.state.noise = bound(this.state.noise - 0.05 * dt);

    if (this.state.year >= 2 && !this.state.lifestyle && time >= this.nextLifestyleAt) {
      this.state.choice = { kind: 'lifestyle', options: ['rest', 'exercise', 'social', 'mindfulness', 'weekendOvertime'] };
      this.nextLifestyleAt = time + 58;
      return;
    }

    if (this.state.qualifying === 'ready' && time >= this.nextQualifyingPrompt) {
      this.state.choice = { kind: 'qualifying', options: ['attempt', 'defer'] };
      return;
    }
    if (this.state.preDefense === 'ready' && time >= this.nextDefensePrompt) {
      this.state.choice = { kind: 'preDefense', options: ['attempt', 'defer'] };
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
    if (milestoneEligible && this.state.milestone?.phase === 'presentation') {
      this.state.milestone.progress += count;
      if (this.state.milestone.progress >= this.state.milestone.target) this.passMilestone();
    }
    const project = this.state.activeProject;
    if (!project || this.state.choice) return;
    const focusFactor = resourceModifiers(this.state).projectEfficiency;
    const lifestyleFactor = !this.state.lifestyle ? 1
      : this.state.lifestyle.id === 'weekendOvertime' ? 1.12
        : this.state.lifestyle.id === 'exercise' ? 0.92 : 0.8;
    project.progress = Math.min(project.goal, project.progress + count * 4 * focusFactor * lifestyleFactor);
    if (project.progress >= project.goal) this.completeProject(project.id);
  }

  onMeeting(): void {
    if (!this.state.supervisorId) return;
    const personId = this.state.supervisorPersonId ?? SUPERVISOR_PERSON[this.state.supervisorId];
    const supervisor = mentorVectorFor(personId);
    const feedback = evaluateMentor(supervisor, {
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
    if (this.state.supervisorId === 'controlling') this.state.calendarLoad = bound(this.state.calendarLoad + 6);
    if (this.state.supervisorId === 'handsOff') this.state.clarity = bound(this.state.clarity - 2);
    this.state.supervisorFeedback = { ...feedback, remaining: 3.2 };
    const role = adaptAcademicPerson(personId, 'phd-supervisor');
    this.state.supervisorRequests += 1;
    if (this.state.supervisorRequests % 2 === 0 && role.assignmentPressure + role.laborExtraction > .9) {
      this.state.choice = { kind: 'supervisorRequest', options: ['accept', 'setBoundary', 'decline'] };
    }
  }

  onInterruption(): void {
    const boundaryShield = Math.min(0.7, this.state.boundary / 120);
    this.state.calendarLoad = bound(this.state.calendarLoad + 11 * (1 - boundaryShield));
    this.state.noise = bound(this.state.noise + 8 * (1 - boundaryShield * 0.5));
    this.state.pollution = bound(this.state.pollution + 6 * (1 - this.state.purpose / 160));
    this.state.spirit = bound(this.state.spirit - 5 * (1 - this.state.connection / 180));
    if (this.state.supervisorId === 'controlling') {
      this.state.calendarLoad = bound(this.state.calendarLoad + 5);
      this.state.pollution = bound(this.state.pollution + 4);
    } else if (this.state.supervisorId === 'handsOff') {
      this.state.noise = bound(this.state.noise - 2);
    }
  }

  choose(option: string, time: number): boolean {
    const choice = this.state.choice;
    if (!choice || !choice.options.includes(option as never)) return false;
    if (choice.kind === 'project') this.startProject(option as ProjectId, time);
    else if (choice.kind === 'supervisor') this.selectSupervisor(option as SupervisorId);
    else if (choice.kind === 'lifestyle') this.selectLifestyle(option as LifestyleId);
    else if (choice.kind === 'supervisorRequest') this.resolveSupervisorRequest(option as 'accept' | 'setBoundary' | 'decline');
    else if (choice.kind === 'qualifying') this.resolveQualifying(option, time);
    else if (choice.kind === 'preDefense') this.resolvePreDefense(option, time);
    else this.resolveDefense(option, time);
    return true;
  }

  startReviewMilestone(kind: 'qualifying' | 'defense'): void {
    this.state.choice = null;
    this.state.milestone = {
      kind, stance: this.milestoneStance(), phase: 'preparation', remaining: (kind === 'qualifying' ? 3 : 4) * this.milestoneTimingScale,
      progress: 0, target: kind === 'qualifying' ? 9 : 5,
      damageScale: kind === 'qualifying' ? 0.86 : 0.94,
    };
  }

  startReviewChoice(kind: 'supervisor' | 'lifestyle'): void {
    this.state.choice = kind === 'supervisor'
      ? { kind: 'supervisor', options: ['supportive', 'controlling', 'handsOff'] }
      : { kind: 'lifestyle', options: ['rest', 'exercise', 'social', 'mindfulness', 'weekendOvertime'] };
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
    if (scene === 'defenseGate') this.state.preDefense = 'ready';
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

  startReviewAnnualMilestone(completedYear: number): void {
    const bounded = Math.max(1, Math.min(8, Math.round(completedYear)));
    this.state.year = bounded + 1;
    this.state.annualMilestone = bounded === 3 ? null : { kind: bounded === 1 ? 'firstYearTalk' : bounded === 2 ? 'proposal' : 'annualCommittee', completedYear: bounded, remaining: 4 };
    if (bounded === 3) this.state.qualifying = 'ready';
    if (bounded === 1) this.state.choice = { kind: 'supervisor', options: ['supportive', 'controlling', 'handsOff'] };
    this.state.seasonPulse = 4;
    if (bounded !== 1) this.state.choice = null;
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
      supervisorFeedback: this.state.supervisorFeedback ? { ...this.state.supervisorFeedback } : null,
      lifestyle: this.state.lifestyle ? { ...this.state.lifestyle } : null,
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
    this.state.independentResearch = bound(this.state.independentResearch + 12);
    this.contributions.add(id);
    this.state.activeProject = null;
    this.state.energy = bound(this.state.energy + 9);
    this.state.spirit = bound(this.state.spirit + 7);
    this.updateMilestones();
  }

  private applyAnnualReview(year: number): void {
    this.state.annualReviews += 1;
    this.state.calendarLoad = bound(this.state.calendarLoad + 8);
    const completedYear = year - 1;
    this.state.annualMilestone = completedYear === 3 ? null : { kind: completedYear === 1 ? 'firstYearTalk' : completedYear === 2 ? 'proposal' : 'annualCommittee', completedYear, remaining: 4 };
    if (completedYear === 1 && !this.state.supervisorId) {
      this.state.choice = { kind: 'supervisor', options: ['supportive', 'controlling', 'handsOff'] };
    }
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
    // The institutional exam stays fixed at the completed-Year-3 boundary. Project
    // readiness changes its target/damage in resolveQualifying; it never reschedules it.
    if (this.state.qualifying === 'locked' && this.state.year >= 4) {
      this.state.qualifying = 'ready';
    }
    if (this.state.year >= 4 && this.state.defense === 'hidden') this.state.defense = 'visible';
    if (this.state.preDefense === 'hidden' && this.state.qualifying === 'passed' && this.state.thesisStage === 'bloom' && this.state.evidence >= 30 && this.state.independentResearch >= 30) {
      this.state.preDefense = 'ready';
    }
  }

  private resolvePreDefense(option: string, time: number): void {
    this.state.choice = null;
    if (option === 'defer') { this.nextDefensePrompt = time + 25; return; }
    this.state.preDefense = 'passed';
    this.state.revisionRemaining = 12;
    this.state.defense = 'visible';
    this.state.calendarLoad = bound(this.state.calendarLoad + 10);
  }

  private resolveQualifying(option: string, time: number): void {
    this.state.choice = null;
    if (option === 'defer') { this.nextQualifyingPrompt = time + 22; return; }
    this.state.milestone = {
      kind: 'qualifying', stance: this.milestoneStance(), phase: 'preparation', remaining: 3 * this.milestoneTimingScale, progress: 0,
      target: 9,
      damageScale: Math.max(0.62, 1.15 - this.state.evidence / 140),
    };
  }

  private resolveDefense(option: string, time: number): void {
    this.state.choice = null;
    if (option === 'defer') { this.nextDefensePrompt = time + 25; return; }
    this.state.milestone = {
      kind: 'defense', stance: this.milestoneStance(), phase: 'preparation', remaining: 4 * this.milestoneTimingScale, progress: 0,
      target: 5,
      damageScale: Math.max(0.68, 1.2 - (this.state.evidence + this.state.spirit) / 220),
    };
  }

  private stepMilestone(dt: number): void {
    const milestone = this.state.milestone;
    if (!milestone) return;
    milestone.remaining -= dt;
    if (milestone.phase === 'preparation' && milestone.remaining <= 0) {
      this.state.energy = bound(this.state.energy - (milestone.kind === 'qualifying' ? 5 : 8));
      this.state.focus = bound(this.state.focus - (milestone.kind === 'qualifying' ? 6 : 10));
      milestone.phase = 'rehearsal';
      milestone.remaining = 2.5;
      return;
    }
    if (milestone.phase === 'rehearsal' && milestone.remaining <= 0) {
      // Rehearsal is short and corrective: it turns preparation into a small,
      // deterministic clarity/readability benefit before assessed presentation.
      this.state.clarity = bound(this.state.clarity + 3);
      milestone.phase = 'presentation';
      milestone.remaining = 0;
    }
  }

  private milestoneStance(): MilestoneArena['stance'] {
    if (!this.state.supervisorPersonId) return 'mixed';
    const role = adaptAcademicPerson(this.state.supervisorPersonId, 'phd-supervisor');
    if (role.graduationSupport >= .72 && role.noise <= 4) return 'support';
    if (role.laborExtraction >= .6 || role.boundaryReaction < .4) return 'adversarial';
    return 'mixed';
  }

  private selectSupervisor(id: SupervisorId): void {
    this.state.supervisorId = id;
    this.state.supervisorPersonId = SUPERVISOR_PERSON[id];
    this.state.choice = null;
    if (id === 'supportive') {
      this.state.clarity = bound(this.state.clarity + 5);
      this.state.spirit = bound(this.state.spirit + 4);
    } else if (id === 'controlling') {
      this.state.evidence = bound(this.state.evidence + 7);
      this.state.calendarLoad = bound(this.state.calendarLoad + 9);
      this.state.pollution = bound(this.state.pollution + 5);
    } else {
      this.state.boundary = bound(this.state.boundary + 5);
      this.state.clarity = bound(this.state.clarity - 4);
    }
  }

  private resolveSupervisorRequest(option: 'accept' | 'setBoundary' | 'decline'): void {
    const personId = this.state.supervisorPersonId;
    if (!personId) return;
    const behavior = adaptAcademicPerson(personId, 'phd-supervisor');
    this.state.choice = null;
    if (option === 'accept') {
      // Assigned labor creates short-term output but does not grow the independent
      // thesis/project contribution track.
      this.state.assignedLabor = bound(this.state.assignedLabor + 14);
      this.state.signal = bound(this.state.signal + behavior.signal * .45);
      this.state.evidence = bound(this.state.evidence + 6);
      this.state.calendarLoad = bound(this.state.calendarLoad + 18);
      this.state.energy = bound(this.state.energy - 10);
      this.state.spirit = bound(this.state.spirit - behavior.laborExtraction * 12);
      return;
    }
    const respected = behavior.boundaryReaction >= (option === 'setBoundary' ? .46 : .62);
    this.state.lastBoundaryReaction = respected ? 'respected' : 'strained';
    this.state.boundary = bound(this.state.boundary + (option === 'setBoundary' ? 8 : 5));
    if (option === 'setBoundary') {
      this.state.independentResearch = bound(this.state.independentResearch + (respected ? 5 : 2));
    }
    this.state.calendarLoad = bound(this.state.calendarLoad - (respected ? 7 : 2));
    this.state.pollution = bound(this.state.pollution + (respected ? 0 : 8));
    this.state.spirit = bound(this.state.spirit + (respected ? 4 : -5));
  }

  private selectLifestyle(id: LifestyleId): void {
    this.state.choice = null;
    this.state.lifestyle = { id, remaining: 28 };
    if (id === 'rest') this.state.calendarLoad = bound(this.state.calendarLoad + 5);
    else if (id === 'exercise') this.state.calendarLoad = bound(this.state.calendarLoad + 4);
    else if (id === 'social') { this.state.calendarLoad = bound(this.state.calendarLoad + 4); this.state.focus = bound(this.state.focus - 4); }
    else if (id === 'mindfulness') this.state.calendarLoad = bound(this.state.calendarLoad + 3);
    else {
      this.state.evidence = bound(this.state.evidence + 7);
      this.state.energy = bound(this.state.energy - 13);
      this.state.spirit = bound(this.state.spirit - 9);
      this.state.calendarLoad = bound(this.state.calendarLoad + 12);
      this.state.pollution = bound(this.state.pollution + 9);
    }
  }

  private applyLifestyle(dt: number): void {
    const lifestyle = this.state.lifestyle;
    if (!lifestyle) return;
    lifestyle.remaining = Math.max(0, lifestyle.remaining - dt);
    if (lifestyle.id === 'rest') {
      this.state.energy = bound(this.state.energy + 0.5 * dt);
      this.state.focus = bound(this.state.focus + 0.18 * dt);
    } else if (lifestyle.id === 'exercise') {
      this.state.energy = bound(this.state.energy + 0.22 * dt);
      this.state.spirit = bound(this.state.spirit + 0.38 * dt);
      this.state.calendarLoad = bound(this.state.calendarLoad + 0.05 * dt);
    } else if (lifestyle.id === 'social') {
      this.state.spirit = bound(this.state.spirit + 0.42 * dt);
      this.state.connection = bound(this.state.connection + 0.2 * dt);
      this.state.calendarLoad = bound(this.state.calendarLoad + 0.05 * dt);
    } else if (lifestyle.id === 'mindfulness') {
      this.state.noise = bound(this.state.noise - 0.45 * dt);
      this.state.pollution = bound(this.state.pollution - 0.32 * dt);
      this.state.clarity = bound(this.state.clarity + 0.12 * dt);
    } else {
      this.state.evidence = bound(this.state.evidence + 0.16 * dt);
      this.state.energy = bound(this.state.energy - 0.22 * dt);
      this.state.spirit = bound(this.state.spirit - 0.16 * dt);
      this.state.pollution = bound(this.state.pollution + 0.12 * dt);
    }
    if (lifestyle.remaining === 0) this.state.lifestyle = null;
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

export function graduationRequirements(state: Pick<PhdSnapshot, 'qualifying' | 'thesisStage' | 'independentResearch' | 'evidence' | 'preDefense' | 'revisionRemaining' | 'defense'>): Array<{ id: 'qualifying' | 'thesis' | 'independent' | 'evidence' | 'preDefense' | 'revisions' | 'defense'; complete: boolean }> {
  return [
    { id: 'qualifying', complete: state.qualifying === 'passed' },
    { id: 'thesis', complete: state.thesisStage === 'bloom' },
    { id: 'independent', complete: state.independentResearch >= 30 },
    { id: 'evidence', complete: state.evidence >= 30 },
    { id: 'preDefense', complete: state.preDefense === 'passed' },
    { id: 'revisions', complete: state.preDefense === 'passed' && state.revisionRemaining === 0 },
    { id: 'defense', complete: state.defense === 'passed' },
  ];
}

function bound(value: number): number { return Math.max(0, Math.min(100, value)); }
