import { ACADEMIC_PEOPLE, PERSON_CORES, adaptAcademicPerson, type ManagerPersonId, type PersonId } from './people';
import { defaultRelationship, derivePersonBehavior, type PersonBehavior, type RelationshipStateV1, type RoleProfile, type SituationState } from './personScience';
import type { SeededRng } from './rng';

export type CareerPlan = 'researchPhd' | 'employment' | 'undecided';
export type WorkStage = 'offers' | 'trial' | 'conversion' | 'employed' | 'promotion';
export type ManagerId = 'clear-builder' | 'opaque-driver' | 'steady-coach';

export interface ManagerProfile {
  id: ManagerId;
  personId: ManagerPersonId;
  clarity: number; transparency: number; resources: number; autonomy: number;
  stability: number; fairness: number; boundaryRespect: number; feedback: number;
  sponsorship: number; volatility: number;
}

export interface WorkOffer {
  id: 'offer-a' | 'offer-b' | 'offer-c';
  managerId: ManagerId;
  environment: 'structured' | 'fast' | 'exploratory';
  pressure: number;
  opportunity: number;
}

export const MANAGERS: Record<ManagerId, ManagerProfile> = {
  'clear-builder': { id: 'clear-builder', personId: 'mara', clarity: .88, transparency: .86, resources: .72, autonomy: .72, stability: .78, fairness: .84, boundaryRespect: .8, feedback: .86, sponsorship: .7, volatility: .2 },
  'opaque-driver': { id: 'opaque-driver', personId: 'dax', clarity: .36, transparency: .28, resources: .9, autonomy: .34, stability: .42, fairness: .44, boundaryRespect: .3, feedback: .62, sponsorship: .78, volatility: .82 },
  'steady-coach': { id: 'steady-coach', personId: 'noa', clarity: .72, transparency: .74, resources: .58, autonomy: .82, stability: .9, fairness: .8, boundaryRespect: .88, feedback: .7, sponsorship: .48, volatility: .12 },
};

export const WORK_OFFERS: readonly WorkOffer[] = [
  { id: 'offer-a', managerId: 'clear-builder', environment: 'structured', pressure: .48, opportunity: .62 },
  { id: 'offer-b', managerId: 'opaque-driver', environment: 'fast', pressure: .88, opportunity: .9 },
  { id: 'offer-c', managerId: 'steady-coach', environment: 'exploratory', pressure: .38, opportunity: .56 },
];

export function masterRoleOutcome(personId: PersonId, relationship: RelationshipStateV1 = defaultRelationship(), situation: SituationState = { workload: .42, pressure: .38, scarcity: .32, stakes: .45 }, seededRoll = .5): ReturnType<typeof adaptAcademicPerson> {
  return adaptAcademicPerson(personId, 'master-supervisor', relationship, situation, seededRoll);
}

export function partialAcademicSignals(personId: PersonId): Pick<(typeof ACADEMIC_PEOPLE)[PersonId], 'expertise' | 'resources' | 'domainMatch'> {
  const person = ACADEMIC_PEOPLE[personId];
  return { expertise: person.expertise, resources: person.resources, domainMatch: person.domainMatch };
}

/** Seeded, slowly changing labor market. It is influential but deliberately bounded. */
export function seededMarketStrength(seedRng: SeededRng, previous = .5): number {
  const drift = (seedRng.next() - .5) * .12;
  return Math.max(.2, Math.min(.8, previous * .86 + .5 * .14 + drift));
}

export function offerViability(offer: WorkOffer, market: number, experience: number): number {
  return clamp01(.28 + market * .34 + Math.min(1, experience / 100) * .28 + offer.opportunity * .1);
}

/**
 * The initial offer roster stays fixed at three partial-information choices. Market and
 * experience instead change the concrete terms of each available trial: pressure and
 * opportunity. This keeps a weak market meaningful without silently removing choices.
 */
export function effectiveWorkOffer(offer: WorkOffer, market: number, experience: number): WorkOffer {
  const experienceFactor = Math.min(1, experience / 100);
  return {
    ...offer,
    pressure: clamp01(offer.pressure + (.5 - market) * .22 - experienceFactor * .08),
    opportunity: clamp01(offer.opportunity + (market - .5) * .18 + experienceFactor * .12),
  };
}

export function managerPersonBehavior(managerId: ManagerId, relationship: RelationshipStateV1 = defaultRelationship(), situation: SituationState = { workload: .5, pressure: .5, scarcity: .4, stakes: .6 }, seededRoll = .5): PersonBehavior {
  const manager = MANAGERS[managerId];
  const role: RoleProfile = { expertise: manager.feedback, mentoringSkill: manager.feedback, resourceAccess: manager.resources, communicationClarity: manager.clarity, demandLevel: clamp01(.35 + manager.volatility * .45), autonomySupport: manager.autonomy, boundaryRespect: manager.boundaryRespect, allocationFairness: manager.fairness, emotionalSafety: manager.stability, powerAsymmetry: .84 };
  return derivePersonBehavior(PERSON_CORES[manager.personId], role, relationship, situation, seededRoll);
}

export function conversionScore(managerId: ManagerId, performance: number, resources: number, behavior?: Pick<PersonBehavior, 'allocationFairness' | 'supportOpportunity'>): number {
  const manager = MANAGERS[managerId];
  const fairness = behavior?.allocationFairness ?? manager.fairness;
  const support = behavior?.supportOpportunity ?? manager.sponsorship;
  return clamp01(performance * .46 + resources * .24 + fairness * .18 + support * .12 - manager.volatility * .1);
}

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
