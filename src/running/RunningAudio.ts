import { AudioEngine } from '../audio/AudioEngine';
import { Synth, type SoundName } from '../audio/Synth';
import { t } from '../i18n/strings';
import { loadSettings } from '../settings/settings';
import { loadRunningSave, updateRunningSave, type RunningWorld } from './core/save';

type RunningAudioEngine = Pick<AudioEngine, 'state' | 'now' | 'unlockFromUserGesture' | 'setMusicVolume' | 'setSfxVolume' | 'close'>;
type RunningSynth = Pick<Synth, 'play'>;
export interface RunningAudioDependencies { engine?: RunningAudioEngine; synth?: RunningSynth }

export type RunningAudioEvent = 'hit' | 'defeat' | 'pickup' | 'orbit' | 'project' | 'choice' | 'signal' | 'noise' | 'phone' | 'meeting-warning' | 'meeting-start' | 'milestone-warning' | 'boss' | 'success' | 'complete' | 'damage' | 'game-over';

export const RUNNING_MUSIC_IDENTITIES = {
  phd: { notes: [196, 247, 294, 247], spacing: .74, patch: 'bell' as SoundName },
  master: { notes: [220, 277, 330, 370], spacing: .42, patch: 'pluck' as SoundName },
  work: { notes: [110, 110, 147, 123], spacing: .52, patch: 'bass' as SoundName },
} as const;

export const RUNNING_CUES: Partial<Record<RunningAudioEvent, readonly [SoundName, number, number, number]>> = {
  hit: ['pluck', 350, .06, .12], defeat: ['pluck', 520, .1, .2], pickup: ['bell', 760, .18, .18], orbit: ['bell', 920, .35, .28],
  project: ['success', 440, .45, .3], choice: ['uiClick', 480, .1, .25], signal: ['bell', 680, .25, .24], noise: ['miss', 90, .18, .2],
  phone: ['lead', 980, .11, .3], 'meeting-warning': ['bell', 392, .3, .3], 'meeting-start': ['snare', 180, .15, .36],
  'milestone-warning': ['bass', 73, .4, .3], boss: ['kick', 55, .3, .5], success: ['success', 523, .5, .4], complete: ['success', 659, .7, .5],
  damage: ['miss', 75, .15, .25], 'game-over': ['miss', 55, .5, .35],
};

/** Original procedural Running soundtrack and compact event vocabulary. */
export class RunningAudio {
  private readonly engine: RunningAudioEngine;
  private readonly synth: RunningSynth;
  private readonly button: HTMLButtonElement;
  private timer: number | null = null;
  private step = 0;
  private unlocked = false;
  private muted = loadRunningSave().audioMuted;
  private pressure = false;
  private disposed = false;
  private readonly gesture = () => { if (!this.muted) void this.unlock(); };
  private readonly keyGesture = () => { if (!this.muted) void this.unlock(); };

  constructor(private readonly root: HTMLElement, private readonly world: RunningWorld, dependencies: RunningAudioDependencies = {}) {
    const settings = loadSettings();
    this.engine = dependencies.engine ?? new AudioEngine({ musicVolume: settings.musicVolume * 0.3, sfxVolume: settings.sfxVolume * 0.55 });
    this.synth = dependencies.synth ?? new Synth(this.engine as AudioEngine);
    this.button = document.createElement('button');
    this.button.dataset.role = 'running-audio-toggle';
    this.button.style.cssText = 'position:fixed;z-index:70;right:max(14px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));width:48px;height:48px;border-radius:50%;border:1px solid #8fb9ab;background:#0d241ecc;color:#fff;font-size:22px;cursor:pointer;touch-action:manipulation;';
    this.button.addEventListener('click', (event) => { event.stopPropagation(); void this.toggle(); });
    this.button.dataset.world = world;
    this.refreshButton();
    root.appendChild(this.button);
    root.addEventListener('pointerdown', this.gesture, { capture: true });
    window.addEventListener('keydown', this.keyGesture, { capture: true });
  }

  setPressure(active: boolean): void { this.pressure = active; this.button.dataset.pressure = String(active); }

  cue(event: RunningAudioEvent): void {
    if (!this.unlocked || this.muted || this.engine.state !== 'unlocked') return;
    const now = this.engine.now() + 0.01;
    const selected = RUNNING_CUES[event];
    if (!selected) return;
    this.synth.play(selected[0], now, selected[1], selected[2], selected[3]);
    if (event === 'phone') this.synth.play('lead', now + .13, 760, .09, .22);
    if (event === 'meeting-warning') this.synth.play('bell', now + .18, 494, .22, .22);
    if (event === 'meeting-start') this.synth.play('bass', now + .08, 98, .3, .32);
  }

  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.removeEventListener('pointerdown', this.gesture, { capture: true });
    window.removeEventListener('keydown', this.keyGesture, { capture: true });
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.button.remove();
    void this.engine.close();
  }

  private async toggle(): Promise<void> {
    this.muted = !this.muted;
    updateRunningSave({ audioMuted: this.muted });
    this.refreshButton();
    if (this.muted) {
      this.engine.setMusicVolume(0);
      this.engine.setSfxVolume(0);
    } else {
      const settings = loadSettings();
      this.engine.setMusicVolume(settings.musicVolume * 0.3);
      this.engine.setSfxVolume(settings.sfxVolume * 0.55);
      await this.unlock();
      this.cue('choice');
    }
  }

  private async unlock(): Promise<void> {
    if (this.unlocked || this.disposed) return;
    try {
      const unlocked = await this.engine.unlockFromUserGesture();
      if (this.disposed) return;
      this.unlocked = unlocked;
      this.button.dataset.unlocked = String(this.unlocked);
      if (this.unlocked && this.timer === null) {
        this.root.removeEventListener('pointerdown', this.gesture, { capture: true });
        window.removeEventListener('keydown', this.keyGesture, { capture: true });
        this.musicTick();
      }
    } catch { this.unlocked = false; }
  }

  private musicTick(): void {
    if (this.disposed) return;
    const identity = RUNNING_MUSIC_IDENTITIES[this.world];
    if (this.unlocked && !this.muted && this.engine.state === 'unlocked') {
      const now = this.engine.now() + .04;
      const note = identity.notes[this.step % identity.notes.length]!;
      this.synth.play(identity.patch, now, note, identity.spacing * .55, .12);
      if (this.pressure) this.synth.play('hatClosed', now + identity.spacing * .5, undefined, undefined, .1);
      if (this.world === 'work' && this.step % 4 === 3) this.synth.play('uiClick', now + .24, 880, .05, .08);
      this.step += 1;
    }
    if (!this.disposed) this.timer = window.setTimeout(() => this.musicTick(), musicIntervalMs(this.world));
  }

  private refreshButton(): void {
    this.button.textContent = this.muted ? '🔇' : '🔊';
    this.button.setAttribute('aria-label', this.muted ? t('running.audioOff') : t('running.audioOn'));
    this.button.title = this.button.getAttribute('aria-label') ?? '';
    this.button.setAttribute('aria-pressed', String(this.muted));
  }
}

export function musicIntervalMs(world: RunningWorld): number { return RUNNING_MUSIC_IDENTITIES[world].spacing * 1000; }
