import { PERSON_SCHEMA, defaultRelationship, derivePersonBehavior, type PersonBehavior, type PersonCoreV1, type RelationshipStateV1, type RoleProfile, type SituationState } from './personScience';

export const DEFAULT_ACADEMIC_CAST = ['cl-au', 'rs-hd', 'wm-lg', 'ex-la', 'st-ct', 'fr-cd', 'op-vl', 'pr-hp'] as const;
export type DefaultAcademicPersonId = typeof DEFAULT_ACADEMIC_CAST[number];
export type LegacyAcademicPersonId = 'mei' | 'rowan' | 'lin';
export type PersonId = LegacyAcademicPersonId | DefaultAcademicPersonId;
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
  'cl-au': core('cl-au', 'CL-AU', 'CL-AU', [.71, .78, .48, .68, .31], [.82, .84, .78, .7]),
  'rs-hd': core('rs-hd', 'RS-HD', 'RS-HD', [.76, .9, .62, .43, .54], [.55, .5, .46, .42]),
  'wm-lg': core('wm-lg', 'WM-LG', 'WM-LG', [.63, .66, .42, .72, .36], [.77, .75, .72, .69]),
  'ex-la': core('ex-la', 'EX-LA', 'EX-LA', [.91, .51, .33, .64, .39], [.73, .69, .76, .74]),
  'st-ct': core('st-ct', 'ST-CT', 'ST-CT', [.52, .86, .46, .57, .27], [.8, .82, .79, .68]),
  'fr-cd': core('fr-cd', 'FR-CD', 'FR-CD', [.68, .81, .71, .39, .65], [.43, .38, .34, .31]),
  'op-vl': core('op-vl', 'OP-VL', 'OP-VL', [.84, .44, .28, .75, .22], [.86, .83, .88, .8]),
  'pr-hp': core('pr-hp', 'PR-HP', 'PR-HP', [.73, .92, .76, .35, .7], [.4, .36, .28, .29]),
};

const ACADEMIC_ROLE_PROFILES: Record<AcademicRole, Record<PersonId, RoleProfile>> = {
  'phd-supervisor': {
    mei: role(.9, .88, .76, .82, .36, .86, .9, .86, .9, .78),
    rowan: role(.97, .48, .92, .84, .88, .26, .2, .42, .3, .9),
    lin: role(.64, .5, .38, .34, .32, .9, .92, .78, .74, .72),
    'cl-au': role(.86, .83, .7, .9, .42, .88, .84, .82, .84, .75),
    'rs-hd': role(.94, .67, .91, .68, .78, .52, .48, .58, .61, .88),
    'wm-lg': role(.82, .78, .63, .72, .48, .72, .76, .77, .79, .73),
    'ex-la': role(.9, .61, .48, .58, .38, .91, .82, .71, .76, .7),
    'st-ct': role(.79, .86, .69, .84, .55, .63, .79, .8, .82, .76),
    'fr-cd': role(.96, .58, .88, .62, .9, .32, .25, .4, .38, .91),
    'op-vl': role(.76, .49, .36, .43, .28, .94, .91, .84, .86, .68),
    'pr-hp': role(.98, .52, .95, .71, .92, .29, .22, .35, .34, .94),
  },
  'master-supervisor': {
    mei: role(.88, .78, .7, .76, .42, .68, .86, .84, .86, .66),
    rowan: role(.94, .56, .84, .8, .72, .4, .3, .48, .4, .74),
    lin: role(.62, .62, .34, .42, .28, .72, .9, .78, .78, .58),
    'cl-au': role(.84, .8, .68, .88, .38, .82, .86, .83, .86, .64),
    'rs-hd': role(.91, .71, .86, .7, .65, .58, .56, .63, .68, .72),
    'wm-lg': role(.8, .81, .59, .76, .42, .7, .8, .8, .82, .62),
    'ex-la': role(.87, .68, .44, .62, .34, .86, .84, .75, .8, .58),
    'st-ct': role(.77, .84, .66, .86, .48, .66, .82, .82, .84, .66),
    'fr-cd': role(.93, .62, .82, .64, .76, .4, .34, .48, .46, .79),
    'op-vl': role(.74, .58, .33, .48, .26, .88, .92, .86, .88, .57),
    'pr-hp': role(.95, .55, .9, .72, .82, .36, .3, .43, .42, .84),
  },
};

/** Compatibility view retained for existing presentation and Boss adapters. */
const ALL_ACADEMIC_PERSON_IDS: readonly PersonId[] = ['mei', 'rowan', 'lin', ...DEFAULT_ACADEMIC_CAST];
export const ACADEMIC_PEOPLE = Object.fromEntries(ALL_ACADEMIC_PERSON_IDS.map((id) => {
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

export interface PublicAcademicProfile { code: string; qualities: readonly [string, string, string]; uncertainty: 'low' | 'medium' | 'high' }
const PUBLIC_ACADEMIC: Record<DefaultAcademicPersonId, PublicAcademicProfile> = {
  'cl-au': { code: 'CL-AU', qualities: ['clarity', 'autonomy', 'access'], uncertainty: 'low' },
  'rs-hd': { code: 'RS-HD', qualities: ['resources', 'structure', 'demand'], uncertainty: 'medium' },
  'wm-lg': { code: 'WM-LG', qualities: ['weekly', 'development', 'stability'], uncertainty: 'low' },
  'ex-la': { code: 'EX-LA', qualities: ['exploration', 'autonomy', 'cross-field'], uncertainty: 'medium' },
  'st-ct': { code: 'ST-CT', qualities: ['structure', 'clarity', 'development'], uncertainty: 'low' },
  'fr-cd': { code: 'FR-CD', qualities: ['resources', 'career', 'demand'], uncertainty: 'high' },
  'op-vl': { code: 'OP-VL', qualities: ['autonomy', 'exploration', 'low-contact'], uncertainty: 'medium' },
  'pr-hp': { code: 'PR-HP', qualities: ['prestige', 'resources', 'high-pace'], uncertainty: 'high' },
};
const LEGACY_PUBLIC_ACADEMIC: Record<LegacyAcademicPersonId, PublicAcademicProfile> = {
  mei: { code: 'CL-AS', qualities: ['clarity', 'access', 'development'], uncertainty: 'low' },
  rowan: { code: 'RS-DM', qualities: ['resources', 'structure', 'demand'], uncertainty: 'high' },
  lin: { code: 'AU-LC', qualities: ['autonomy', 'exploration', 'low-contact'], uncertainty: 'medium' },
};

export function academicPublicProfile(personId: PersonId): PublicAcademicProfile {
  if (personId in PUBLIC_ACADEMIC) return PUBLIC_ACADEMIC[personId as DefaultAcademicPersonId];
  return LEGACY_PUBLIC_ACADEMIC[personId as LegacyAcademicPersonId];
}

/** Deterministic selection without consuming gameplay RNG. */
export function academicCandidatesForSeed(seed: number): readonly [DefaultAcademicPersonId, DefaultAcademicPersonId, DefaultAcademicPersonId] {
  const pool = [...DEFAULT_ACADEMIC_CAST];
  let value = seed >>> 0;
  for (let index = pool.length - 1; index > 0; index -= 1) {
    value = hash32(value + index * 0x9e3779b9);
    const target = value % (index + 1);
    [pool[index], pool[target]] = [pool[target]!, pool[index]!];
  }
  return [pool[0]!, pool[1]!, pool[2]!];
}

export function seededAcademicBackground(personId: PersonId, seed: number, locale: 'zh-CN' | 'en'): string {
  const career = locale === 'zh-CN' ? ['职业早期', '职业中期', '资深阶段'] : ['Early career', 'Mid-career', 'Senior stage'];
  const group = locale === 'zh-CN' ? ['小型团队', '中型团队', '大型团队'] : ['Small group', 'Medium group', 'Large group'];
  const context = locale === 'zh-CN' ? ['每周一对一沟通', '组会较多', '沟通多由团队成员协助', '近期进入相邻研究方向', '正处在经费续期阶段', '目前处于稳定期'] : ['Weekly one-to-one meetings', 'Meeting-heavy rhythm', 'Communication is partly delegated', 'Moving into an adjacent field', 'Working through a funding renewal', 'Currently in a stable period'];
  const value = hashText(`${seed}:${personId}`);
  return `${career[value % career.length]} · ${group[(value >>> 5) % group.length]}。${context[(value >>> 11) % context.length]}。`;
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
function hash32(value: number): number { value = Math.imul(value ^ (value >>> 16), 0x45d9f3b); value = Math.imul(value ^ (value >>> 16), 0x45d9f3b); return (value ^ (value >>> 16)) >>> 0; }
function hashText(value: string): number { let hash = 2166136261; for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619); return hash >>> 0; }
