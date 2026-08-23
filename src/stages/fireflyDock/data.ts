/**
 * Stage 1: Firefly Dock / 萤火码头 — data scaffold.
 *
 * Content is all ORIGINAL procedural composition (not derivative of
 * any 3rd party rhythm IP). Music is a simple 8-bar original cycle in
 * C major (I–vi–IV–V + variation) at 120 BPM, 4/4 meter.
 *
 * NOTE: this file only DECLARES data shapes + a starter score.
 * Actual gameplay rendering/tap-mapping/judgement-wiring is NOT done
 * until GATE 0 PASS (per task rule: Gate 0 timing foundation first).
 */

import type { ScheduledEvent } from '../../timing/Scheduler';
import type { SoundName } from '../../audio/Synth';

/** Stage 1 original music meta. */
export const FIREFLY_BPM = 120 as const;
export const FIREFLY_METER: [number, number] = [4, 4];
export const FIREFLY_TOTAL_BARS = 16 as const; // 2 × 8-bar cycles + short intro

/**
 * Original 8-bar C major chord progression (bars 0–7).
 * Roman numerals: I → vi → IV → V → I → vi → ii → V
 * Not derived from any commercial work.
 * Scale degrees mapped to semitones for procedural Synth.
 */
export const FIREFLY_CHORDS: Array<{
  bar: number;
  /** semitone offsets from C4 for chord tones (root, third, fifth). */
  chord: [number, number, number];
  /** scale degree root name (for programmer readability only). */
  label: string;
  /** bass semitone offset from C3. */
  bass: number;
}> = [
  { bar: 0, chord: [0, 4, 7], label: 'C', bass: -12 },        // I   C-E-G
  { bar: 1, chord: [-3, 0, 4], label: 'Am', bass: -9 },       // vi  A-C-E (6 semitones up is A; -3=C offset from A=9→-3)
  { bar: 2, chord: [-5, -1, 2], label: 'F', bass: -17 },      // IV  F-A-C (F=-5 → C semitone)
  { bar: 3, chord: [-2, 2, 5], label: 'G', bass: -14 },       // V   G-B-D
  { bar: 4, chord: [0, 4, 7], label: 'C', bass: -12 },        // I
  { bar: 5, chord: [-3, 0, 4], label: 'Am', bass: -9 },       // vi
  { bar: 6, chord: [-10, -5, -1], label: 'Dm', bass: -10 },   // ii  D-F-A
  { bar: 7, chord: [-2, 2, 5], label: 'G', bass: -14 },       // V
];

/**
 * Authored cue progression (judge targets are attached later).
 * Original rhythm, not copied from any commercial level. The first half uses
 * short call-and-response phrases, Variation B leaves a deliberate breathing
 * rest, and the climax becomes a readable rising stream before an outro pair.
 *
 * beat fractional positions: 0 = downbeat, 1 = beat 2, etc.
 */
export const FIREFLY_CUE_BEATS_IN_CYCLE: Array<{ bar: number; beatInBar: number; id: string }> = [
  // Intro: spacious lantern calls.
  { bar: 0, beatInBar: 2, id: 'intro-call-1' },
  { bar: 1, beatInBar: 0, id: 'intro-call-2' },
  { bar: 1, beatInBar: 2, id: 'intro-response' },
  // Main A: two clearly related call-and-response phrases.
  { bar: 2, beatInBar: 0, id: 'main-call-1' },
  { bar: 3, beatInBar: 0, id: 'main-call-2' },
  { bar: 3, beatInBar: 2, id: 'main-response-1' },
  { bar: 4, beatInBar: 2, id: 'main-response-2' },
  { bar: 5, beatInBar: 0, id: 'main-response-3' },
  { bar: 6, beatInBar: 0, id: 'main-resolution-1' },
  { bar: 6, beatInBar: 2, id: 'main-resolution-2' },
  // Variation B: a three-light question, then a six-beat rest and response.
  { bar: 7, beatInBar: 2, id: 'variation-question-1' },
  { bar: 8, beatInBar: 0, id: 'variation-question-2' },
  { bar: 8, beatInBar: 2, id: 'variation-question-3' },
  { bar: 10, beatInBar: 0, id: 'variation-response-1' },
  { bar: 10, beatInBar: 2, id: 'variation-response-2' },
  // Climax: fast but predictable continuous launches.
  { bar: 11, beatInBar: 1, id: 'climax-1' },
  { bar: 11, beatInBar: 2.5, id: 'climax-2' },
  { bar: 12, beatInBar: 0, id: 'climax-3' },
  { bar: 12, beatInBar: 2, id: 'climax-4' },
  { bar: 12, beatInBar: 3.5, id: 'climax-5' },
  { bar: 13, beatInBar: 1, id: 'climax-6' },
  { bar: 13, beatInBar: 2.5, id: 'climax-7' },
  { bar: 14, beatInBar: 0, id: 'climax-8' },
  { bar: 14, beatInBar: 2, id: 'climax-9' },
  // Outro: two final stars complete the constellation.
  { bar: 15, beatInBar: 0, id: 'outro-1' },
  { bar: 15, beatInBar: 2, id: 'outro-2' },
];

/** Simple pre-computed drum loop for one bar (4 beats) — original pattern. */
export const FIREFLY_DRUM_ONE_BAR: Array<{ beatInBar: number; sound: SoundName }> = [
  { beatInBar: 0, sound: 'kick' },
  { beatInBar: 0.5, sound: 'hatClosed' },
  { beatInBar: 1, sound: 'hatClosed' },
  { beatInBar: 1.5, sound: 'hatClosed' },
  { beatInBar: 2, sound: 'snare' },
  { beatInBar: 2.5, sound: 'hatClosed' },
  { beatInBar: 3, sound: 'hatClosed' },
  { beatInBar: 3.5, sound: 'hatClosed' },
];

/** Intro click cue: 2 empty bars after the tutorial. */
export const FIREFLY_INTRO_BARS = 0 as const;

/**
 * Build a flat list of scheduled audio events for the full song.
 * This is a pure data → event function; gameplay cues and judge targets
 * are added SEPARATELY in stage logic (not here) to keep music layer
 * independent from judge layer.
 *
 * Bass plays root on downbeat 1; pluck arpeggiates the chord on
 * beats 1, 2, 3, 4; bell accents on beat 1 of odd bars.
 */
export function buildFireflyDockMusicEvents(): ScheduledEvent[] {
  const out: ScheduledEvent[] = [];
  const semitoneToRatio = (st: number) => Math.pow(2, st / 12);
  const C3 = 130.81;
  const C4 = 261.63;
  for (let bar = 0; bar < FIREFLY_TOTAL_BARS; bar++) {
    const chord = FIREFLY_CHORDS[bar % FIREFLY_CHORDS.length];
    // Drums every bar.
    for (const d of FIREFLY_DRUM_ONE_BAR) {
      const beat = bar * FIREFLY_METER[0] + d.beatInBar;
      out.push({ type: 'audio', beat, sound: d.sound });
    }
    // Bass on downbeat.
    {
      const beat = bar * FIREFLY_METER[0] + 0;
      out.push({
        type: 'audio',
        beat,
        sound: 'bass',
        freqHz: C3 * semitoneToRatio(chord.bass),
      });
    }
    // Chord arpeggio on pluck.
    for (let i = 0; i < 4; i++) {
      const beatInBar = i;
      const beat = bar * FIREFLY_METER[0] + beatInBar;
      const note = chord.chord[i % chord.chord.length];
      out.push({
        type: 'audio',
        beat,
        sound: 'pluck',
        freqHz: C4 * semitoneToRatio(note),
      });
    }
    // Bell on downbeat of bar 0, 4, 8, 12 → every 4 bars.
    if (bar % 4 === 0) {
      const beat = bar * FIREFLY_METER[0] + 0;
      out.push({
        type: 'audio',
        beat,
        sound: 'bell',
        freqHz: C4 * semitoneToRatio(chord.chord[2]), // fifth
      });
    }
  }
  return out;
}
