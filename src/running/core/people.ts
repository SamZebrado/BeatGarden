import { PERSON_SCHEMA, defaultRelationship, derivePersonBehavior, type PersonBehavior, type PersonCoreV1, type RelationshipStateV1, type RoleProfile, type SituationState } from './personScience';

export type PersonId = 'mei' | 'rowan' | 'lin';
export type ManagerPersonId = 'mara' | 'dax' | 'noa';
export type StablePersonId = PersonId | ManagerPersonId;
export type AcademicRole = 'phd-supervisor' | 'master-supervisor';

export interface AcademicRoleBehavior {
  personId: PersonId;
  role: AcademicRole;
  signal: number;
  noise: number;
  independentResearchSupport: number;
  assignmentPressure: number;
  laborExtraction: number;
  graduationSupport: number;
  boundaryReaction: number;
  opportunitySupport: number;
  allocationFairness: number;
}

export const PERSON_CORES: Record<StablePersonId, PersonCoreV1> = {
  mei: core('mei', 'Mei', '梅', [.74, .76, .56, .79, .25], [.88, .9, .82, .72]),
  rowan: core('rowan', 'Rowan', '若文', [.66, .9, .72, .36, .61], [.46, .43, .38, .34]),
  lin: core('lin', 'Lin', '林', [.86, .43, .3, .7, .37], [.8, .78, .84, .77]),
  mara: core('mara', 'Mara', '玛拉', [.62, .82, .58, .71, .28], [.82, .84, .76, .68]),
  dax: core('dax', 'Dax', '达克斯', [.7, .86, .8, .34, .69], [.42, .4, .3, .28]),
  noa: core('noa', 'Noa', '诺亚', [.8, .56, .38, .76, .2], [.84, .82, .86, .8]),
};

const ACADEMIC_ROLE_PROFILES: Record<AcademicRole, Record<PersonId, RoleProfile>> = {
  'phd-supervisor': {
    mei: role(.9, .88, .76, .82, .36, .86, .9, .86, .9, .78),
    rowan: role(.97, .48, .92, .84, .88, .26, .2, .42, .3, .9),
    lin: role(.64, .5, .38, .34, .32, .9, .92, .78, .74, .72),
  },
  'master-supervisor': {
    mei: role(.88, .78, .7, .76, .42, .68, .86, .84, .86, .66),
    rowan: role(.94, .56, .84, .8, .72, .4, .3, .48, .4, .74),
    lin: role(.62, .62, .34, .42, .28, .72, .9, .78, .78, .58),
  },
};

/** Compatibility view retained for existing presentation and Boss adapters. */
export const ACADEMIC_PEOPLE = Object.fromEntries((['mei', 'rowan', 'lin'] as const).map((id) => {
  const profile = ACADEMIC_ROLE_PROFILES['phd-supervisor'][id];
  return [id, {
    id, expertise: profile.expertise, resources: profile.resourceAccess, clarity: profile.communicationClarity,
    autonomy: profile.autonomySupport, emotionalSafety: profile.emotionalSafety, fairness: profile.allocationFairness,
    boundaryRespect: profile.boundaryRespect, stability: 1 - PERSON_CORES[id].bigFive.neuroticism,
    domainMatch: profile.mentoringSkill, transparency: PERSON_CORES[id].nonExploitation.sincerity,
  }];
})) as Record<PersonId, { id: PersonId; expertise: number; resources: number; clarity: number; autonomy: number; emotionalSafety: number; fairness: number; boundaryRespect: number; stability: number; domainMatch: number; transparency: number }>;

export function academicRoleProfile(personId: PersonId, roleId: AcademicRole): RoleProfile {
  return { ...ACADEMIC_ROLE_PROFILES[roleId][personId] };
}

export function academicPersonBehavior(personId: PersonId, roleId: AcademicRole, relationship: RelationshipStateV1 = defaultRelationship(), situation: SituationState = { workload: .45, pressure: .4, scarcity: .35, stakes: .5 }, seededRoll = .5): PersonBehavior {
  return derivePersonBehavior(PERSON_CORES[personId], ACADEMIC_ROLE_PROFILES[roleId][personId], relationship, situation, seededRoll);
}

export function adaptAcademicPerson(personId: PersonId, roleId: AcademicRole, relationship: RelationshipStateV1 = defaultRelationship(), situation: SituationState = { workload: .45, pressure: .4, scarcity: .35, stakes: .5 }, seededRoll = .5): AcademicRoleBehavior {
  const profile = ACADEMIC_ROLE_PROFILES[roleId][personId];
  const compatibility = ACADEMIC_PEOPLE[personId];
  const behavior = academicPersonBehavior(personId, roleId, relationship, situation, seededRoll);
  const isPhd = roleId === 'phd-supervisor';
  return {
    personId, role: roleId,
    signal: Math.round((compatibility.expertise * .44 + compatibility.clarity * .28 + compatibility.domainMatch * .28) * 24),
    noise: Math.round(behavior.noise * (isPhd ? 22 : 18)),
    independentResearchSupport: clamp01(profile.autonomySupport * (isPhd ? .82 : .55) + behavior.supportOpportunity * (isPhd ? .18 : .3)),
    assignmentPressure: behavior.requestPressure,
    laborExtraction: clamp01((1 - behavior.allocationFairness) * .58 + profile.powerAsymmetry * .24 + profile.demandLevel * .18),
    graduationSupport: clamp01(behavior.supportOpportunity * .44 + behavior.allocationFairness * .26 + profile.communicationClarity * .18 + (1 - PERSON_CORES[personId].bigFive.neuroticism) * .12 - (isPhd ? 0 : .05)),
    boundaryReaction: behavior.boundaryResponse,
    opportunitySupport: behavior.supportOpportunity,
    allocationFairness: behavior.allocationFairness,
  };
}

function core(id: StablePersonId, en: string, zh: string, traits: [number, number, number, number, number], integrity: [number, number, number, number]): PersonCoreV1 {
  return { schema: PERSON_SCHEMA, id, name: { en, 'zh-CN': zh }, bigFive: { openness: traits[0], conscientiousness: traits[1], extraversion: traits[2], agreeableness: traits[3], neuroticism: traits[4] }, nonExploitation: { sincerity: integrity[0], fairness: integrity[1], greedAvoidance: integrity[2], modesty: integrity[3] } };
}
function role(expertise: number, mentoringSkill: number, resourceAccess: number, communicationClarity: number, demandLevel: number, autonomySupport: number, boundaryRespect: number, allocationFairness: number, emotionalSafety: number, powerAsymmetry: number): RoleProfile {
  return { expertise, mentoringSkill, resourceAccess, communicationClarity, demandLevel, autonomySupport, boundaryRespect, allocationFairness, emotionalSafety, powerAsymmetry };
}
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
