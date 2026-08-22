export type PersonId = 'mei' | 'rowan' | 'lin';
export type AcademicRole = 'phd-supervisor' | 'master-supervisor';

export interface PersonProfile {
  id: PersonId;
  expertise: number;
  resources: number;
  clarity: number;
  autonomy: number;
  emotionalSafety: number;
  fairness: number;
  boundaryRespect: number;
  stability: number;
  domainMatch: number;
  transparency: number;
}

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
}

/** Stable people, separate from their current gameplay role or any Boss mapping. */
export const ACADEMIC_PEOPLE: Record<PersonId, PersonProfile> = {
  mei: { id: 'mei', expertise: .9, resources: .76, clarity: .82, autonomy: .86, emotionalSafety: .9, fairness: .86, boundaryRespect: .9, stability: .86, domainMatch: .78, transparency: .82 },
  rowan: { id: 'rowan', expertise: .97, resources: .92, clarity: .84, autonomy: .26, emotionalSafety: .3, fairness: .42, boundaryRespect: .2, stability: .48, domainMatch: .9, transparency: .52 },
  lin: { id: 'lin', expertise: .64, resources: .38, clarity: .34, autonomy: .9, emotionalSafety: .74, fairness: .78, boundaryRespect: .92, stability: .64, domainMatch: .56, transparency: .7 },
};

export function adaptAcademicPerson(personId: PersonId, role: AcademicRole): AcademicRoleBehavior {
  const person = ACADEMIC_PEOPLE[personId];
  const isPhd = role === 'phd-supervisor';
  const baseNoise = (1 - person.emotionalSafety) * .34 + (1 - person.fairness) * .2
    + (1 - person.boundaryRespect) * .28 + (1 - person.stability) * .18;
  return {
    personId, role,
    signal: Math.round((person.expertise * .44 + person.clarity * .28 + person.domainMatch * .28) * 24),
    noise: Math.round(baseNoise * (isPhd ? 22 : 18)),
    independentResearchSupport: clamp01(person.autonomy * (isPhd ? .9 : .58) + person.clarity * (isPhd ? .1 : .22)),
    assignmentPressure: clamp01((1 - person.autonomy) * (isPhd ? .74 : .48) + person.resources * (isPhd ? .16 : .26)),
    laborExtraction: clamp01((1 - person.fairness) * .48 + (1 - person.boundaryRespect) * .34 + (isPhd ? .12 : .2)),
    graduationSupport: clamp01(person.fairness * .32 + person.clarity * .25 + person.resources * .2 + person.stability * .23 - (isPhd ? 0 : .08)),
    boundaryReaction: clamp01(person.boundaryRespect * .52 + person.fairness * .28 + person.stability * .2),
  };
}

function clamp01(value: number): number { return Math.max(0, Math.min(1, value)); }
