# BeatGarden Running Mode — Post-Gate-F Product-Depth Review

Identity: **OpenAI Codex working on BeatGarden Running Mode, not Captain Sam.**

Request nonce: `BEATGARDEN_PRODUCT_DEPTH_REVIEW_20260822_CODEX_13`

This is a new product-depth mission after Running Gates A–F already passed. Do not
reopen those gates. Review the attached two authority prompts and the implementation
bundle at the current working checkpoint.

Implemented in this checkpoint:

- eliminated Master/Work raw choice-ID rendering through zh-CN/en i18n;
- changed the English recurring PhD event from “Group Meeting” to **“Lab Meeting”**;
- added generic, queued, 1.35-second first-seen semantic hints, persisted in Running v2
  and fully absent under `textOff=1`;
- replaced the large virtual joystick ring with a small contact point and directional
  trace while preserving drag-anywhere input;
- added one stable, supportive primary supervisor/PI who is not an enemy; normal Lab
  Meeting pressure is rendered as feedback speech bubbles, while reviewers and the
  final committee remain distinct;
- implemented locale-appropriate annual labels: 年度汇报/开题/中期考核/年度汇报 and
  First Year Talk/Thesis Proposal/Qualifying Exam/Annual Committee Meeting;
- separated voluntary pre-defense/readiness from a bounded revision phase and the final
  playable Defense arena;
- migrated `beatgarden.running.v1` purely into additive `beatgarden.running.v2` with
  completions, milestones, unlocks, difficulty records, seen hints, custom Boss data,
  and Running mute state; Rhythm keys are untouched;
- added original procedural world identities, event SFX, NORMAL/PRESSURE state,
  two-stage Lab Meeting warning/start audio, a safe-area 48px mute control, preference
  persistence, and gesture-gated AudioContext startup;
- added strict data-only `beatgarden-boss.v1`, field/range/enum errors, paste and file
  import surfaces, preview + explicit save confirmation, export/delete, example/prompt,
  and bounded promoted-player generation using the same schema.

Current evidence:

- `npm run lint`: PASS;
- full tests: PASS, 27 files / 170 tests at the latest local checkpoint;
- production build: PASS;
- real browser: zh-CN/en Master/Work cards, English `LAB MEETING`, supervisor versus
  feedback shapes, all four annual labels in both locales, pre-defense → revision,
  390×844 canvas/control layout, textOff/audio independence, mute reload persistence,
  and AudioContext gesture unlock checked without current-page console errors;
- invalid Boss executable/unknown fields rejected and confirm disabled; valid pasted
  Boss preview required confirmation and saved locally;
- Android: not run because `adb devices` currently lists no device.

Please inspect the attached code/tests/docs for substantive correctness. Prioritize:

1. state-machine correctness and whether pre-defense/revision/Defense semantics satisfy
   the prompt without silently reintroducing a fixed-year graduation;
2. save migration safety and isolation from Rhythm storage;
3. first-seen queue/persistence/textOff behavior;
4. Web Audio autoplay, lifecycle, cleanup, cue coverage, and two-stage Lab Meeting cue;
5. Boss validation/data-only security, explicit confirmation, and promoted-player policy;
6. actual localization leakage or semantic contradictions;
7. any P0/P1/P2 defect that must be repaired before commit/push.

Return exactly one verdict:

- `BEATGARDEN_PRODUCT_DEPTH_REVIEW: PASS`, or
- `BEATGARDEN_PRODUCT_DEPTH_REVIEW: REVISE`

For REVISE, give a finite prioritized repair list with exact file/symbol references.
For PASS, retain honest qualifiers for Android and audible-listening dimensions that
the supplied evidence cannot prove.

End your response with this exact standalone line:

BEATGARDEN_REVIEW_RESPONSE_COMPLETE
