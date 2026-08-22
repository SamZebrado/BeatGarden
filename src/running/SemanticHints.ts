import { t, type StringKey } from '../i18n/strings';
import { loadRunningSave, markHintSeen, updateRunningSave } from './core/save';

const SYMBOLS: Record<string, string> = {
  phone: '▯≋', reviewer: '△?', committee: '◉', courseBlock: '▦', deadline: '△!', request: '▰→', notification: '●))',
  orbit: '◎', satellite: '⬡', resources: '⚡◉♡', signal: '◇', noise: '≈', meeting: '◉', activeProject: '◆', thesis: '♧', milestone: '⬡', supervisor: '✦',
};

/** Generic, persistent, non-blocking first-seen explanation surface. */
export class SemanticHints {
  private readonly host: HTMLDivElement;
  private readonly seen = new Set(loadRunningSave().seenHints);
  private active: Animation | null = null;
  private activeId: string | null = null;
  private readonly queue: Array<{ id: keyof typeof SYMBOLS; key: StringKey }> = [];

  constructor(root: HTMLElement, private readonly textOff: boolean) {
    this.host = document.createElement('div');
    this.host.dataset.role = 'running-semantic-hint';
    this.host.setAttribute('aria-live', 'polite');
    this.host.style.cssText = 'position:fixed;z-index:55;left:50%;top:max(92px,calc(env(safe-area-inset-top) + 76px));transform:translateX(-50%);width:min(330px,calc(100vw - 44px));padding:11px 16px;border:1px solid #9bdcc1;border-radius:15px;background:#081712e8;color:#effff6;text-align:center;white-space:pre-line;font:600 14px/1.38 system-ui;pointer-events:none;opacity:0;';
    if (!textOff) root.appendChild(this.host);
  }

  show(id: keyof typeof SYMBOLS, key: StringKey): void {
    if (this.textOff || this.seen.has(id) || this.activeId === id || this.queue.some((item) => item.id === id)) return;
    this.queue.push({ id, key });
    this.runNext();
  }

  private runNext(): void {
    if (this.activeId || !this.queue.length) return;
    const { id, key } = this.queue.shift()!;
    this.activeId = id;
    this.seen.add(id);
    markHintSeen(id);
    this.host.textContent = `${SYMBOLS[id]}  ${t(key)}`;
    this.active = this.host.animate([
      { opacity: 0, transform: 'translate(-50%,8px)' },
      { opacity: 1, transform: 'translate(-50%,0)', offset: 0.14 },
      { opacity: 1, transform: 'translate(-50%,-4px)', offset: 0.72 },
      { opacity: 0, transform: 'translate(-50%,-14px)' },
    ], { duration: 1350, easing: 'ease-out', fill: 'forwards' });
    void this.active.finished.then(() => { this.activeId = null; this.active = null; this.runNext(); }).catch(() => undefined);
  }

  destroy(): void { this.queue.length = 0; this.active?.cancel(); this.activeId = null; this.host.remove(); }
}

export function resetSemanticHints(): void { updateRunningSave({ seenHints: [] }); }
