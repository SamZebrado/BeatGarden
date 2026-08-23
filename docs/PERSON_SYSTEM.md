# BeatGarden Person System v1

Status: maintained architecture authority. Current source and tests remain executable
authority.

## Boundary and purpose

BeatGarden Person Science v1 is a bounded game model, not a psychometric diagnosis,
personality test, hiring tool, clinical model, or real-person inference system. The game
does not infer protected or sensitive characteristics. Its continuous values are authored
fictional design inputs. They describe probabilistic tendencies with modest weights;
they never label a Person as a type, good/bad, moral/immoral, competent/incompetent, or
supportive/unsupportive by themselves.

The architecture is:

```text
stable Person Core
  -> role-specific Role Profile
  -> saved Relationship + derived Situation
  -> bounded seeded behavior
  -> short gameplay effects (Signal, Noise, requests, support, boundaries, opportunity)
```

## Data ownership

### Person Core

`src/running/core/personScience.ts` owns `beatgarden-person.v1`. A core has one stable
ID, localized name, five continuous Big Five values (`openness`, `conscientiousness`,
`extraversion`, `agreeableness`, `neuroticism`) and four separate non-exploitation
facets (`sincerity`, `fairness`, `greedAvoidance`, `modesty`). Every value is finite and
bounded to 0..1. Unknown fields are rejected.

`src/running/core/people.ts` contains the built-in cores. Mei, Rowan and Lin each keep
the same core in PhD and Master. Mara, Dax and Noa are stable cores behind the three
Work manager roles. Custom People use the same strict schema but do not replace built-in
People at runtime in v1.

Broad traits are not gameplay authorities for role competence or integrity:

- Openness can modestly affect receptiveness/exploration, not intelligence.
- Conscientiousness can modestly affect structure and follow-through, not expertise.
- Extraversion can affect interaction initiative, not communication quality.
- Agreeableness can affect conflict softness, not allocation fairness or integrity.
- Neuroticism contributes only to context-dependent stress expression, not malice or
  incompetence.

Non-exploitation is deliberately narrower than morality. It contributes to tendencies
around manipulation, credit/resources, privilege seeking and exploitation of asymmetric
power. It does not define all ethics, kindness, competence or guaranteed behavior.

### Role Profile

Role profiles remain separate and role-specific. They own `expertise`,
`mentoringSkill`, `resourceAccess`, `communicationClarity`, `demandLevel`,
`autonomySupport`, `boundaryRespect`, `allocationFairness`, `emotionalSafety` and
`powerAsymmetry`. `academicRoleProfile`, `adaptAcademicPerson` and
`managerPersonBehavior` translate the same stable Person differently in a PhD,
Master or Work role. A person can therefore be expert but a weak mentor, agreeable but
unfair in allocation, conscientious but controlling, or high-Signal and high-Noise.

### Relationship and Situation

`RelationshipStateV1` stores bounded `trust`, `reciprocity`, `unresolvedConflict` and
`boundaryHistory`, plus bounded counts for `acceptedLabor` and `boundaryAttempts`.
Interactions adjust them gradually and clamp every value; no single response permanently
ruins a run. PhD keeps the selected supervisor relationship in its authoritative state.
Master and Work keep only relationships encountered in the current run.

Situation is derived rather than redundantly saved: workload comes from Calendar,
pressure from current hazards/milestones, scarcity from Energy/Focus, and stakes from
career stage or an active climax. This allows the same Person and role to behave
differently under pressure without inventing a second state machine.

### Behavior and gameplay effects

`derivePersonBehavior` combines the four layers into seven bounded values: `signal`,
`noise`, `requestPressure`, `supportOpportunity`, `boundaryResponse`,
`allocationFairness` and `interactionInitiative`. Role weights dominate; broad-trait
weights are deliberately modest. Random variation is small and receives only the
authoritative seeded RNG. Continuous per-frame Work scoring uses a neutral roll so it
does not advance RNG; discrete offers and interactions sample it.

PhD meetings and requests update Signal, Noise, workload, support and relationship
history. Master supervisor selection and term interactions affect Focus, Spirit and
Calendar. Work offer and manager interactions affect trial clarity, pressure, support,
conversion and promotion. The player sees short consequences, not hidden trait scores.

## Persistence and compatibility

Relationship data is an additive field inside the existing
`beatgarden.running.current.v1` authority. Old valid checkpoints without it remain valid
and default to a neutral relationship. New checkpoints always export it. Strict current-
run validation rejects out-of-range relationship values or unknown Person IDs and removes
only the corrupt current-run key; Running meta and Rhythm data remain untouched.

Custom People are an additive `customPeople` array in `beatgarden.running.v2`. Older v2
meta without the field migrates in memory to an empty array. `beatgarden-person.v1`
files and `beatgarden-custom-content.v1` bundles are data-only, strictly validated and
use stable-ID replacement semantics. Same ID replaces on confirmed import; same display
name with a different ID coexists. Relationship history is run authority, never copied
into a reusable Person file.

## Deliberate v1 limits

- No player-authored role editor or automatic custom-Person casting is implemented.
- No visible psychometric profile, diagnostic label or permanent personality HUD exists.
- No claim is made that authored values measure real people.
- Relationship effects are intentionally few and recoverable rather than a social
  simulation or hidden reputation score.
- A Person is not a Boss. Bosses remain strict encounter configs under
  `beatgarden-boss.v1`; conversion between concepts is never automatic.

Scientific provenance and construct-to-code traceability are maintained in
`docs/RESEARCH_FOUNDATIONS.md`.
