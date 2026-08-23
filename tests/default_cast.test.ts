import { describe, expect, it } from 'vitest';
import { DEFAULT_ACADEMIC_CAST, PERSON_CORES, academicCandidatesForSeed, academicPersonBehavior, academicPublicProfile, academicRoleProfile, seededAcademicBackground } from '../src/running/core/people';

describe('anonymous seeded default cast',()=>{
  it('contains eight public-code academic profiles and offers exactly three unique candidates',()=>{
    expect(DEFAULT_ACADEMIC_CAST).toHaveLength(8); const candidates=academicCandidatesForSeed(42); expect(candidates).toHaveLength(3); expect(new Set(candidates).size).toBe(3);
    for(const id of DEFAULT_ACADEMIC_CAST) expect(academicPublicProfile(id).code).toMatch(/^[A-Z]{2}-[A-Z]{2}$/);
  });
  it('is deterministic for one seed and varies across seeds',()=>{
    expect(academicCandidatesForSeed(91)).toEqual(academicCandidatesForSeed(91));
    expect(new Set(Array.from({length:12},(_,seed)=>academicCandidatesForSeed(seed).join('|'))).size).toBeGreaterThan(3);
  });
  it('generates bounded fictional backgrounds without mutating Person Core or leaking hidden integrity',()=>{
    const id=academicCandidatesForSeed(7)[0]; const before=structuredClone(PERSON_CORES[id]); const background=seededAcademicBackground(id,7,'en');
    expect(background).toBe(seededAcademicBackground(id,7,'en')); expect(background.length).toBeLessThan(150); expect(PERSON_CORES[id]).toEqual(before);
    expect(JSON.stringify(academicPublicProfile(id))).not.toMatch(/fairness|sincerity|greed|modesty/i); expect(background).not.toMatch(/university|professor|dr\.|mei|rowan|lin/i);
  });
  it('routes one stable Person through distinct PhD and Master roles',()=>{
    const id=DEFAULT_ACADEMIC_CAST[0]; expect(academicRoleProfile(id,'phd-supervisor')).not.toEqual(academicRoleProfile(id,'master-supervisor'));
    expect(academicPersonBehavior(id,'phd-supervisor')).not.toEqual(academicPersonBehavior(id,'master-supervisor'));
  });
});
