# BeatGarden Research Foundations

Status: maintained design-evidence authority. This document explains why research-
derived mechanics exist. It does not turn correlations into causal claims and does not
replace executable tests or source authority.

## Product principles

> BeatGarden does not aim to turn real-world concepts into enemy skins. It aims to turn
> parts of real-world causal structure into playable rules.

> Mechanically simple, systemically truthful.

BeatGarden is game first. Research improves hidden causal structure. Gameplay copy
answers only what happened, what it means to the player and what the player can do.
Legend/Information may explain one deeper layer. Terms, citations, limitations and
model details live here—not on the permanent HUD, in battle citations, or in first-seen
hints.

## Evidence base used for Person Science v1

- The official [International Personality Item Pool construct guide](https://ipip.ori.org/Finding_Scales_to_Measure_Particular_Constructs.htm)
  documents continuous Big Five/Five-Factor measures and cautions that historically
  distinct measurement traditions can use similar labels.
- The official [HEXACO scale descriptions](https://hexaco.org/scaledescriptions%26lang%3Den)
  define Honesty-Humility and its sincerity, fairness, greed avoidance and modesty
  facets. BeatGarden borrows this narrower facet structure under the neutral internal
  label “non-exploitation.”
- Kim, Jörg and Klassen’s [meta-analysis of teacher personality](https://pmc.ncbi.nlm.nih.gov/articles/PMC6407857/)
  synthesized 25 studies (N=6,294) on Big Five associations with teacher effectiveness
  and burnout. It supports treating broad traits as probabilistic correlates in a
  teaching-adjacent context, not as direct measures of mentoring quality or causation.
- Wilmot and Ones’ [quantitative synthesis of Big Five and performance](https://pubmed.ncbi.nlm.nih.gov/34687041/)
  synthesized 54 meta-analyses (N=554,778). Associations vary by trait and performance
  category and are generally modest; this supports small prior weights, not deterministic
  occupational predictions.

These sources justify construct selection and guardrails. They do not validate
BeatGarden’s numeric coefficients, fictional character values, or individual gameplay
outcomes.

## Construct mappings

### Big Five continuous temperament

1. **Construct:** Openness, Conscientiousness, Extraversion, Agreeableness and
   Neuroticism as broad continuous domains.
2. **Source/evidence:** IPIP construct framework; the two quantitative syntheses above.
3. **Evidence actually supports:** Broad individual-difference domains can show
   probabilistic associations with behavior and work/teaching outcomes; strength and
   relevance vary by outcome and context.
4. **Game translation:** Small priors in `derivePersonBehavior`: Openness contributes to
   exploratory/support opportunity, Conscientiousness to signal/structure and request
   tendency, Extraversion to initiative, Agreeableness to conflict softness, and
   Neuroticism to stress expression when pressure is present.
5. **Does not mean:** intelligence, expertise, communication quality, fairness,
   morality, mentoring skill, malice, diagnosis, or guaranteed behavior.
6. **Status:** implemented.
7. **Product simplification:** One 0..1 value per domain, no facets or questionnaire,
   no player-visible scores.
8. **Design extrapolation:** The exact coefficients and mapping to Signal/Noise are
   authored balance choices, not empirical effect estimates.

Traceability: Big Five → modest behavioral priors →
`src/running/core/personScience.ts::derivePersonBehavior`.

### Honesty-Humility-derived non-exploitation

1. **Construct:** Sincerity, fairness, greed avoidance and modesty facets of HEXACO
   Honesty-Humility.
2. **Source/evidence:** Official HEXACO scale descriptions.
3. **Evidence actually supports:** The construct describes tendencies involving
   manipulation, fraud/corruption, material/status entitlement and modest self-regard.
4. **Game translation:** A separate `nonExploitation` object contributes to allocation
   fairness, request pressure and boundary response under asymmetric roles.
5. **Does not mean:** universal morality, kindness, competence, emotional safety, or a
   guarantee that exploitation will/will not occur.
6. **Status:** implemented.
7. **Product simplification:** Four unit-range authored facets; no higher-order morality
   score and no player-visible label.
8. **Design extrapolation:** Combining facets into a bounded allocation tendency and
   applying it to fictional power/resource interactions is a game-design mapping.

Traceability: Honesty-Humility facets → non-exploitation/resource-allocation prior →
`src/running/core/personScience.ts::derivePersonBehavior`.

### Role competence, support and power

1. **Construct:** Expertise, mentoring/management skill, resources, clarity, demands,
   autonomy support, boundaries, allocation fairness, emotional safety and power
   asymmetry.
2. **Source/evidence:** Existing BeatGarden role model plus autonomy-support and
   mentoring concepts as design inputs; Person Science v1 does not claim a validated
   composite scale for this exact list.
3. **Evidence actually supports:** The cited personality evidence does not make broad
   traits equivalent to role performance. Role conditions must remain separate.
4. **Game translation:** `RoleProfile` is the dominant behavior authority; the same
   core can yield different PhD/Master/Work behavior.
5. **Does not mean:** an occupational assessment, causal personnel model, or claim that
   one dimension fully determines outcomes.
6. **Status:** implemented; literature mapping beyond the personality-separation
   guardrail remains partial.
7. **Product simplification:** Ten normalized role inputs feed a small set of readable
   gameplay consequences.
8. **Design extrapolation:** Role weights and the fictional profiles are authored.

Traceability: role conditions → Person-role adapter →
`src/running/core/people.ts::adaptAcademicPerson` and
`src/running/core/lifePaths.ts::managerPersonBehavior`.

### Relationship and Situation moderation

1. **Construct:** Context-sensitive behavior plus trust, reciprocity, unresolved
   conflict and boundary history.
2. **Source/evidence:** This release does not claim a single validated psychological
   instrument for the combined state; the need not to treat broad traits as deterministic
   is consistent with the syntheses above.
3. **Evidence actually supports:** Associations are variable and should not be treated
   as context-free causal laws.
4. **Game translation:** Existing Calendar, pressure, resources and career stage derive
   Situation; choices update a small recoverable Relationship state that influences
   later interactions.
5. **Does not mean:** relationship diagnosis, attachment classification, permanent
   punishment, or prediction of a real relationship.
6. **Status:** implemented, bounded.
7. **Product simplification:** Four unit-range relationship dimensions plus two event
   counts; four derived situation inputs; no new HUD meters.
8. **Design extrapolation:** Update rates and downstream gameplay effects are explicit
   game mechanics, not empirical longitudinal parameters.

Traceability: run state/choices → Relationship + Situation →
`updateRelationship`, `PhdSystems.currentSituation`, and
`ScenarioSimulation.currentSituation`.

## Information and ownership boundaries

- **Running Save Bundle (`beatgarden-save-bundle.v1`):** player Running progression,
  meta/custom libraries and optional unfinished run.
- **Person (`beatgarden-person.v1`):** reusable stable fictional individual definition;
  no relationship or role history.
- **Boss (`beatgarden-boss.v1`):** reusable gameplay encounter definition; a Person is
  not a Boss and conversion is never automatic.
- **Relationship/Situation:** normally current-run authority; Situation is derived and
  Relationship is persisted only when future-affecting.

The UI calls these Save Data, People and Bosses. Players do not need to learn the
storage hierarchy or research vocabulary.

## Quality and future-work rule

Prefer systematic reviews/meta-analyses, established validated models and scales, then
primary studies or authoritative framework documentation. Mixed evidence must be
described as mixed. If a research concept lacks a fun, legible mechanic, document and
defer it; do not add meters or explanatory coursework. Every future research mapping
must retain the eight fields used above and clearly label Design Extrapolation.
