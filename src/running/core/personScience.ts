export const PERSON_SCHEMA = 'beatgarden-person.v1' as const;

export interface BigFiveTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface NonExploitationFacets {
  sincerity: number;
  fairness: number;
  greedAvoidance: number;
  modesty: number;
}

export interface PersonCoreV1 {
  schema: typeof PERSON_SCHEMA;
  id: string;
  name: { en: string; 'zh-CN': string };
  bigFive: BigFiveTraits;
  nonExploitation: NonExploitationFacets;
}

export interface RoleProfile {
  expertise: number;
  mentoringSkill: number;
  resourceAccess: number;
  communicationClarity: number;
  demandLevel: number;
  autonomySupport: number;
  boundaryRespect: number;
  allocationFairness: number;
  emotionalSafety: number;
  powerAsymmetry: number;
}

export interface RelationshipStateV1 {
  trust: number;
  reciprocity: number;
  unresolvedConflict: number;
  boundaryHistory: number;
  acceptedLabor: number;
  boundaryAttempts: number;
}

export interface SituationState {
  workload: number;
  pressure: number;
  scarcity: number;
  stakes: number;
}

export interface PersonBehavior {
  signal: number;
  noise: number;
  requestPressure: number;
  supportOpportunity: number;
  boundaryResponse: number;
  allocationFairness: number;
  interactionInitiative: number;
}

export function defaultRelationship(): RelationshipStateV1 {
  return { trust: .5, reciprocity: .5, unresolvedConflict: 0, boundaryHistory: .5, acceptedLabor: 0, boundaryAttempts: 0 };
}

/**
 * A bounded game translation, not a psychometric diagnosis. Broad traits have modest
 * weights; role authority, relationship history, and current circumstances remain
 * independently visible in the calculation.
 */
export function derivePersonBehavior(core: PersonCoreV1, role: RoleProfile, relationship: RelationshipStateV1, situation: SituationState, seededRoll = .5): PersonBehavior {
  const traits = core.bigFive;
  const integrity = core.nonExploitation;
  const stressExpression = situation.pressure * (.35 + traits.neuroticism * .3);
  const stochastic = (clamp01(seededRoll) - .5) * .08;
  const integrityFairness = integrity.fairness * .52 + integrity.sincerity * .18 + integrity.greedAvoidance * .22 + integrity.modesty * .08;
  return {
    signal: clamp01(role.communicationClarity * .58 + role.expertise * .22 + traits.conscientiousness * .08 + traits.openness * .05 + relationship.trust * .07 - stressExpression * .12 + stochastic),
    noise: clamp01((1 - role.emotionalSafety) * .32 + role.demandLevel * .22 + stressExpression * .24 + relationship.unresolvedConflict * .18 + traits.extraversion * situation.workload * .05 - traits.agreeableness * .04 - stochastic),
    requestPressure: clamp01(role.demandLevel * .45 + role.powerAsymmetry * .2 + situation.workload * .12 + situation.scarcity * .08 + traits.extraversion * .06 + traits.conscientiousness * .05 + relationship.acceptedLabor * .025 - integrity.greedAvoidance * .08),
    supportOpportunity: clamp01(role.mentoringSkill * .34 + role.resourceAccess * .23 + role.autonomySupport * .18 + relationship.reciprocity * .13 + relationship.trust * .07 + traits.openness * .05 - situation.scarcity * .08),
    boundaryResponse: clamp01(role.boundaryRespect * .5 + relationship.boundaryHistory * .17 + integrity.sincerity * .12 + integrity.fairness * .11 + traits.agreeableness * .06 - situation.pressure * .09 - relationship.unresolvedConflict * .08 + stochastic),
    allocationFairness: clamp01(role.allocationFairness * .52 + integrityFairness * .36 + relationship.reciprocity * .07 - situation.scarcity * .08 - situation.stakes * .03),
    interactionInitiative: clamp01(.25 + traits.extraversion * .22 + traits.conscientiousness * .08 + role.demandLevel * .18 + situation.stakes * .08 - situation.workload * .05),
  };
}

export function updateRelationship(state: RelationshipStateV1, patch: Partial<RelationshipStateV1>): RelationshipStateV1 {
  return {
    trust: clamp01(patch.trust ?? state.trust),
    reciprocity: clamp01(patch.reciprocity ?? state.reciprocity),
    unresolvedConflict: clamp01(patch.unresolvedConflict ?? state.unresolvedConflict),
    boundaryHistory: clamp01(patch.boundaryHistory ?? state.boundaryHistory),
    acceptedLabor: boundedCount(patch.acceptedLabor ?? state.acceptedLabor),
    boundaryAttempts: boundedCount(patch.boundaryAttempts ?? state.boundaryAttempts),
  };
}

export function parsePersonCore(value: unknown): { ok: true; value: PersonCoreV1 } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!record(value)) return { ok: false, errors: ['person: expected object.'] };
  unknownKeys(value, ['schema', 'id', 'name', 'bigFive', 'nonExploitation'], 'person', errors);
  if (value.schema !== PERSON_SCHEMA) errors.push(`schema: expected ${PERSON_SCHEMA}.`);
  if (typeof value.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(value.id)) errors.push('id: expected a safe 1-64 character identifier.');
  if (!record(value.name)) errors.push('name: expected object.');
  else {
    unknownKeys(value.name, ['en', 'zh-CN'], 'name', errors);
    boundedText(value.name.en, 'name.en', errors);
    boundedText(value.name['zh-CN'], 'name.zh-CN', errors);
  }
  validateUnitObject(value.bigFive, ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'], 'bigFive', errors);
  validateUnitObject(value.nonExploitation, ['sincerity', 'fairness', 'greedAvoidance', 'modesty'], 'nonExploitation', errors);
  return errors.length ? { ok: false, errors } : { ok: true, value: structuredClone(value) as unknown as PersonCoreV1 };
}

export function isRelationshipState(value: unknown): value is RelationshipStateV1 {
  if (!record(value)) return false;
  const keys = ['trust', 'reciprocity', 'unresolvedConflict', 'boundaryHistory'];
  return Object.keys(value).every((key) => [...keys, 'acceptedLabor', 'boundaryAttempts'].includes(key))
    && keys.every((key) => unit(value[key]))
    && integer(value.acceptedLabor, 0, 1000) && integer(value.boundaryAttempts, 0, 1000);
}

export function cloneRelationship(value: RelationshipStateV1 | undefined): RelationshipStateV1 {
  return value && isRelationshipState(value) ? { ...value } : defaultRelationship();
}

function validateUnitObject(value: unknown, keys: string[], path: string, errors: string[]): void {
  if (!record(value)) { errors.push(`${path}: expected object.`); return; }
  unknownKeys(value, keys, path, errors);
  for (const key of keys) if (!unit(value[key])) errors.push(`${path}.${key}: expected a finite value from 0 to 1.`);
}
function unknownKeys(value: Record<string, unknown>, allowed: string[], path: string, errors: string[]): void {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) errors.push(`${path}.${key}: unknown field.`);
}
function boundedText(value: unknown, path: string, errors: string[]): void { if (typeof value !== 'string' || value.length < 1 || value.length > 80) errors.push(`${path}: expected 1-80 characters.`); }
function boundedCount(value: number): number { return Math.max(0, Math.min(1000, Math.round(value))); }
function integer(value: unknown, min: number, max: number): boolean { return Number.isInteger(value) && (value as number) >= min && (value as number) <= max; }
function unit(value: unknown): boolean { return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1; }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
