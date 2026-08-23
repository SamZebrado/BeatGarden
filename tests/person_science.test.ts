import { describe, expect, it } from 'vitest';
import { MANAGERS, managerPersonBehavior, masterRoleOutcome } from '../src/running/core/lifePaths';
import { PERSON_CORES, academicPersonBehavior, academicRoleProfile, adaptAcademicPerson } from '../src/running/core/people';
import { PERSON_SCHEMA, defaultRelationship, derivePersonBehavior, parsePersonCore, updateRelationship, type PersonCoreV1, type RoleProfile } from '../src/running/core/personScience';

const situation = { workload: .62, pressure: .55, scarcity: .4, stakes: .7 };

describe('Person Science v1', () => {
  it('uses one valid stable core for each recurring academic person across roles', () => {
    for (const id of ['mei', 'rowan', 'lin'] as const) {
      expect(parsePersonCore(PERSON_CORES[id])).toEqual({ ok: true, value: PERSON_CORES[id] });
      expect(adaptAcademicPerson(id, 'phd-supervisor').personId).toBe(id);
      expect(masterRoleOutcome(id).personId).toBe(id);
      expect(PERSON_CORES[id].schema).toBe(PERSON_SCHEMA);
    }
  });

  it('keeps role competence and authority separate from the stable Person core', () => {
    const before = structuredClone(PERSON_CORES.mei);
    expect(academicRoleProfile('mei', 'phd-supervisor')).not.toEqual(academicRoleProfile('mei', 'master-supervisor'));
    academicPersonBehavior('mei', 'phd-supervisor', defaultRelationship(), situation, .3);
    academicPersonBehavior('mei', 'master-supervisor', defaultRelationship(), situation, .3);
    expect(PERSON_CORES.mei).toEqual(before);
  });

  it('does not treat Big Five agreeableness as the authority for allocation fairness', () => {
    const role = academicRoleProfile('rowan', 'phd-supervisor');
    const low = structuredClone(PERSON_CORES.rowan);
    const high = structuredClone(PERSON_CORES.rowan);
    low.bigFive.agreeableness = 0;
    high.bigFive.agreeableness = 1;
    expect(derivePersonBehavior(low, role, defaultRelationship(), situation, .5).allocationFairness)
      .toBe(derivePersonBehavior(high, role, defaultRelationship(), situation, .5).allocationFairness);
  });

  it('keeps non-exploitation facets distinct and behaviorally bounded', () => {
    const role = academicRoleProfile('mei', 'phd-supervisor');
    const fair = structuredClone(PERSON_CORES.mei);
    const exploitative = structuredClone(PERSON_CORES.mei);
    fair.nonExploitation = { sincerity: 1, fairness: 1, greedAvoidance: 1, modesty: 1 };
    exploitative.nonExploitation = { sincerity: 0, fairness: 0, greedAvoidance: 0, modesty: 0 };
    const fairBehavior = derivePersonBehavior(fair, role, defaultRelationship(), situation, .5);
    const exploitativeBehavior = derivePersonBehavior(exploitative, role, defaultRelationship(), situation, .5);
    expect(fairBehavior.allocationFairness).toBeGreaterThan(exploitativeBehavior.allocationFairness);
    expect(fairBehavior.requestPressure).toBeLessThan(exploitativeBehavior.requestPressure);
    for (const value of Object.values(fairBehavior)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(fairBehavior)) expect(value).toBeLessThanOrEqual(1);
  });

  it('is deterministic for fixed inputs while situation and relationship remain consequential', () => {
    const first = academicPersonBehavior('lin', 'phd-supervisor', defaultRelationship(), situation, .17);
    const second = academicPersonBehavior('lin', 'phd-supervisor', defaultRelationship(), situation, .17);
    expect(second).toEqual(first);
    const pressured = academicPersonBehavior('lin', 'phd-supervisor', defaultRelationship(), { workload: 1, pressure: 1, scarcity: 1, stakes: 1 }, .17);
    expect(pressured).not.toEqual(first);
    const strained = updateRelationship(defaultRelationship(), { trust: .1, reciprocity: .1, unresolvedConflict: .9 });
    expect(academicPersonBehavior('lin', 'phd-supervisor', strained, situation, .17)).not.toEqual(first);
  });

  it('bridges every work manager to a stable Person without erasing the role profile', () => {
    for (const manager of Object.values(MANAGERS)) {
      expect(parsePersonCore(PERSON_CORES[manager.personId]).ok).toBe(true);
      expect(managerPersonBehavior(manager.id, defaultRelationship(), situation, .5)).toEqual(managerPersonBehavior(manager.id, defaultRelationship(), situation, .5));
    }
    expect(MANAGERS['clear-builder'].personId).not.toBe(MANAGERS['opaque-driver'].personId);
  });

  it('strictly rejects unknown fields, invalid identifiers, and out-of-range traits', () => {
    const invalid = { ...structuredClone(PERSON_CORES.mei), id: '../mei', script: 'alert(1)' } as PersonCoreV1 & { script: string };
    invalid.bigFive.openness = 1.1;
    const result = parsePersonCore(invalid);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join('\n')).toMatch(/unknown field|identifier|finite value/);
  });

  it('role profile changes remain stronger than incidental stochastic variation', () => {
    const core = PERSON_CORES.mei;
    const supportive: RoleProfile = { expertise: 1, mentoringSkill: 1, resourceAccess: 1, communicationClarity: 1, demandLevel: .1, autonomySupport: 1, boundaryRespect: 1, allocationFairness: 1, emotionalSafety: 1, powerAsymmetry: .7 };
    const poor: RoleProfile = { ...supportive, expertise: 0, mentoringSkill: 0, resourceAccess: 0, communicationClarity: 0, autonomySupport: 0, boundaryRespect: 0, allocationFairness: 0, emotionalSafety: 0 };
    const good = derivePersonBehavior(core, supportive, defaultRelationship(), situation, 0);
    const bad = derivePersonBehavior(core, poor, defaultRelationship(), situation, 1);
    expect(good.signal).toBeGreaterThan(bad.signal);
    expect(good.supportOpportunity).toBeGreaterThan(bad.supportOpportunity);
  });
});
