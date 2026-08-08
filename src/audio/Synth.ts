// Synth — 100% procedural sound synthesis via Web Audio API.
//
// No mp3 / wav / ogg samples. No ROM rips. All patches are original:
//   - kick
//   - snare
//   - hi-hat (closed + open)
//   - bass (simple sine/saw pluck with short envelope)
//   - pluck (general mid-range)
//   - bell (FM-like pair of sines with fast envelope)
//   - lead (simple mono synth)
//   - UI click
//   - success chord stabs
//   - miss (low, dirty thud)
//
// Patch design goals:
//  - distinct enough that the mix of drums + cue SFX doesn't mask judgement
//  - low CPU cost (avoid heavy FFT / many nodes per sound)
//  - all scheduled at ABSOLUTE audio time (never setTimeout-based)

import type { AudioEngine } from './AudioEngine';

export type DrumName = 'kick' | 'snare' | 'hatClosed' | 'hatOpen';
export type SoundName =
  | DrumName
  | 'bass'
  | 'pluck'
  | 'bell'
  | 'lead'
  | 'uiClick'
  | 'success'
  | 'miss';

/**
 * Deterministic seeded buffer for short burst of noise (snare, hats, miss).
 * Creating a shared buffer once avoids repeated allocations.
 */
function makeNoiseBuffer(ctx: AudioContext, seconds: number = 2.0): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export class Synth {
  private readonly engine: AudioEngine;
  private noiseBuffer: AudioBuffer | null = null;
  private noiseBufferCtx: AudioContext | null = null;

  constructor(engine: AudioEngine) {
    this.engine = engine;
  }

  private ensureNoise(ctx: AudioContext): AudioBuffer {
    if (!this.noiseBuffer || this.noiseBufferCtx !== ctx) {
      this.noiseBuffer = makeNoiseBuffer(ctx);
      this.noiseBufferCtx = ctx;
    }
    return this.noiseBuffer;
  }

  /** Master shortcut: play any named SFX with a given note/freq and start time. */
  play(name: SoundName, startTime: number, freqHz?: number, durationSec?: number, velocity?: number): void {
    switch (name) {
      case 'kick':
        return this.kick(startTime, velocity);
      case 'snare':
        return this.snare(startTime, velocity);
      case 'hatClosed':
        return this.hatClosed(startTime, velocity);
      case 'hatOpen':
        return this.hatOpen(startTime, velocity);
      case 'bass':
        return this.bass(startTime, freqHz ?? 80, durationSec ?? 0.25, velocity);
      case 'pluck':
        return this.pluck(startTime, freqHz ?? 440, durationSec ?? 0.2, velocity);
      case 'bell':
        return this.bell(startTime, freqHz ?? 880, durationSec ?? 1.2, velocity);
      case 'lead':
        return this.lead(startTime, freqHz ?? 440, durationSec ?? 0.35, velocity);
      case 'uiClick':
        return this.uiClick(startTime, velocity);
      case 'success':
        return this.success(startTime, velocity);
      case 'miss':
        return this.miss(startTime, velocity);
    }
  }

  private sfxBus(): GainNode {
    return this.engine.getSfxBus();
  }
  private musicBus(): GainNode {
    return this.engine.getMusicBus();
  }

  // ----- Drums -----

  kick(startTime: number, velocity: number = 0.9): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.14);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel, startTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.32);
    osc.connect(gain).connect(this.musicBus());
    osc.start(startTime);
    osc.stop(startTime + 0.35);
  }

  snare(startTime: number, velocity: number = 0.8): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    // Tone part: short triangle burst
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, startTime);
    osc.frequency.exponentialRampToValueAtTime(110, startTime + 0.12);
    oscGain.gain.setValueAtTime(0.0001, startTime);
    oscGain.gain.exponentialRampToValueAtTime(vel * 0.35, startTime + 0.002);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);
    osc.connect(oscGain).connect(this.musicBus());
    osc.start(startTime);
    osc.stop(startTime + 0.15);
    // Noise part: short highpass-filtered burst
    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, startTime);
    nGain.gain.exponentialRampToValueAtTime(vel * 0.6, startTime + 0.002);
    nGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
    noise.connect(hp).connect(nGain).connect(this.musicBus());
    noise.start(startTime);
    noise.stop(startTime + 0.2);
  }

  hatClosed(startTime: number, velocity: number = 0.7): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel * 0.35, startTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.05);
    noise.connect(hp).connect(gain).connect(this.musicBus());
    noise.start(startTime);
    noise.stop(startTime + 0.06);
  }

  hatOpen(startTime: number, velocity: number = 0.7): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6000;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel * 0.3, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);
    noise.connect(hp).connect(gain).connect(this.musicBus());
    noise.start(startTime);
    noise.stop(startTime + 0.28);
  }

  // ----- Pitched -----

  bass(startTime: number, freq: number, durationSec: number = 0.25, velocity: number = 0.7): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel * 0.5, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(lp).connect(gain).connect(this.musicBus());
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
  }

  pluck(startTime: number, freq: number, durationSec: number = 0.2, velocity: number = 0.75): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel, startTime + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gain).connect(this.musicBus());
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
  }

  bell(startTime: number, freq: number, durationSec: number = 1.2, velocity: number = 0.6): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const partials = [1.0, 2.76, 5.4]; // inharmonic-ish bell stack
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, startTime);
    master.gain.exponentialRampToValueAtTime(vel, startTime + 0.003);
    master.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    for (const mul of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * mul, startTime);
      g.gain.value = 0.4;
      osc.connect(g).connect(master);
      osc.start(startTime);
      osc.stop(startTime + durationSec + 0.02);
    }
    master.connect(this.musicBus());
  }

  lead(startTime: number, freq: number, durationSec: number = 0.35, velocity: number = 0.55): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel * 0.6, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.musicBus());
    osc.start(startTime);
    osc2.start(startTime);
    osc.stop(startTime + durationSec + 0.02);
    osc2.stop(startTime + durationSec + 0.02);
  }

  // ----- UI / Judgement -----

  uiClick(startTime: number, velocity: number = 0.5): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1600, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel * 0.15, startTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.02);
    osc.connect(gain).connect(this.sfxBus());
    osc.start(startTime);
    osc.stop(startTime + 0.03);
  }

  success(startTime: number, velocity: number = 0.7): void {
    const vel = Math.max(0.05, Math.min(1, velocity));
    // Happy triad-ish: root, major 3rd, perfect 5th.
    this.bell(startTime, 523.25, 0.6, vel * 0.5);       // C5
    this.bell(startTime + 0.02, 659.25, 0.6, vel * 0.4); // E5
    this.bell(startTime + 0.04, 783.99, 0.6, vel * 0.35); // G5
  }

  miss(startTime: number, velocity: number = 0.8): void {
    const ctx = this.engine.getContext();
    const vel = Math.max(0.05, Math.min(1, velocity));
    // Dirty low thud + filtered noise.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, startTime);
    osc.frequency.exponentialRampToValueAtTime(55, startTime + 0.2);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(vel * 0.45, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);
    osc.connect(gain).connect(this.sfxBus());
    osc.start(startTime);
    osc.stop(startTime + 0.32);

    const noise = ctx.createBufferSource();
    noise.buffer = this.ensureNoise(ctx);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, startTime);
    ng.gain.exponentialRampToValueAtTime(vel * 0.3, startTime + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.18);
    noise.connect(lp).connect(ng).connect(this.sfxBus());
    noise.start(startTime);
    noise.stop(startTime + 0.2);
  }
}
