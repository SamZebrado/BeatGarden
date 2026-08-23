import { t } from '../i18n/strings';
import type { RunningSnapshot } from './core/simulation';

const COOLDOWN_SECONDS = 12;

/** Session-only, presentation-only player-state reactions. */
export class EmojiBeta {
  private readonly button: HTMLButtonElement;
  private enabled = false;
  private lastShownAt = Number.NEGATIVE_INFINITY;
  private active: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement, textOff: boolean) {
    this.button = document.createElement('button');
    this.button.dataset.role = 'running-emoji-toggle';
    this.button.textContent = textOff ? '🙂' : t('running.emojiBeta');
    this.button.setAttribute('aria-label', t('running.emojiBeta'));
    this.button.setAttribute('aria-pressed', 'false');
    this.button.title = t('running.emojiBeta');
    this.button.style.cssText = `position:fixed;z-index:70;right:max(14px,env(safe-area-inset-right));top:calc(max(14px,env(safe-area-inset-top)) + 58px);height:38px;${textOff ? 'width:44px;padding:0;font-size:20px' : 'padding:0 12px;font-size:13px'};border-radius:19px;border:1px solid #8fb9ab;background:#0d241ecc;color:#fff;cursor:pointer;touch-action:manipulation;white-space:nowrap;`;
    this.button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.enabled = !this.enabled;
      this.button.dataset.enabled = String(this.enabled);
      this.button.setAttribute('aria-pressed', String(this.enabled));
      this.button.style.background = this.enabled ? '#245b49e8' : '#0d241ecc';
      if (!this.enabled) this.clearActive();
    });
    root.appendChild(this.button);
  }

  update(state: RunningSnapshot, prior: RunningSnapshot | null, screenPosition?: { x: number; y: number }): void {
    if (!this.enabled || !prior || state.time - this.lastShownAt < COOLDOWN_SECONDS) return;
    const emoji = reactionFor(state, prior);
    if (!emoji) return;
    this.lastShownAt = state.time;
    this.show(emoji, screenPosition?.x ?? innerWidth / 2, screenPosition?.y ?? innerHeight / 2);
  }

  destroy(): void {
    this.clearActive();
    this.button.remove();
  }

  private show(emoji: string, screenX: number, screenY: number): void {
    this.clearActive();
    const marker = document.createElement('span');
    marker.dataset.role = 'running-player-emoji';
    marker.textContent = emoji;
    marker.style.cssText = `position:fixed;z-index:45;left:${screenX}px;top:${screenY - 28}px;font-size:34px;line-height:1;pointer-events:none;filter:drop-shadow(0 2px 3px #0008);`;
    marker.dataset.screenX = screenX.toFixed(1);
    marker.dataset.screenY = screenY.toFixed(1);
    this.root.appendChild(marker);
    const animation = marker.animate([
      { opacity: 0, transform: 'translate(-50%,8px) scale(.82)' },
      { opacity: 1, transform: 'translate(-50%,-12px) scale(1)', offset: .2 },
      { opacity: 1, transform: 'translate(-50%,-34px) scale(1)', offset: .72 },
      { opacity: 0, transform: 'translate(-50%,-58px) scale(.94)' },
    ], { duration: 1200, easing: 'ease-out', fill: 'forwards' });
    this.active = marker;
    void animation.finished.then(() => {
      if (this.active === marker) this.active = null;
      marker.remove();
    }).catch(() => marker.remove());
  }

  private clearActive(): void {
    this.active?.remove();
    this.active = null;
  }
}

export function reactionFor(state: RunningSnapshot, prior: RunningSnapshot): string | null {
  const milestonePassed = (state.phd.qualifying === 'passed' && prior.phd.qualifying !== 'passed')
    || (state.phd.preDefense === 'passed' && prior.phd.preDefense !== 'passed')
    || (state.phd.defense === 'passed' && prior.phd.defense !== 'passed');
  if (milestonePassed) return '🎓';
  if ((state.phd.pollution >= 65 && prior.phd.pollution < 65) || (state.phd.energy <= 25 && prior.phd.energy > 25)) return '😵';
  if (state.phd.signal > prior.phd.signal || state.phd.clarity - prior.phd.clarity >= 2) return '💡';
  if (state.phd.lifestyle?.id === 'weekendOvertime' && prior.phd.lifestyle?.id !== 'weekendOvertime') return '🔥';
  if ((state.phd.lifestyle?.id === 'rest' || state.phd.lifestyle?.id === 'mindfulness') && state.phd.lifestyle.id !== prior.phd.lifestyle?.id) return '😌';
  return null;
}
