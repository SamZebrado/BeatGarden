import { t } from '../i18n/strings';
import { promotedPlayerBoss, type PromotedPlayerSnapshot } from './core/bossSchema';
import { loadRunningSave, updateRunningSave, type StoredBossMetadata } from './core/save';

/** Explicit post-completion action: a run never creates a Boss until the player chooses this. */
export class PromotionAction {
  private readonly button: HTMLButtonElement;
  private snapshot: PromotedPlayerSnapshot | null = null;

  constructor(root: HTMLElement, private readonly textOff: boolean) {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.dataset.role = 'promote-player-boss';
    this.button.style.cssText = 'display:none;position:fixed;z-index:58;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);min-height:48px;padding:11px 18px;border:1px solid #ffe18b;border-radius:24px;background:#13241f;color:#fff7d4;font:700 14px system-ui;box-shadow:0 8px 26px #0009;touch-action:manipulation';
    this.button.addEventListener('click', this.save);
    root.appendChild(this.button);
  }

  show(snapshot: PromotedPlayerSnapshot): void {
    if (this.snapshot) return;
    this.snapshot = { ...snapshot };
    this.button.textContent = this.textOff ? '✦ +' : `✦  ${t('running.promoteBoss')}`;
    this.button.setAttribute('aria-label', t('running.promoteBoss'));
    this.button.style.display = 'block';
  }

  hide(): void {
    this.snapshot = null;
    this.button.style.display = 'none';
    this.button.disabled = false;
  }

  destroy(): void { this.button.removeEventListener('click', this.save); this.button.remove(); }

  private readonly save = (): void => {
    if (!this.snapshot || this.button.disabled) return;
    const config = promotedPlayerBoss(this.snapshot);
    const current = loadRunningSave();
    const metadata: StoredBossMetadata = {
      id: config.id,
      displayName: config.name.en,
      origin: config.origin,
      worlds: [...config.worlds],
      updatedAt: new Date().toISOString(),
      data: config,
    };
    updateRunningSave({ customBosses: [...current.customBosses.filter((boss) => boss.id !== config.id), metadata] });
    this.button.disabled = true;
    this.button.textContent = this.textOff ? '✦ ✓' : `✓  ${t('running.promoteBossSaved')}`;
  };
}
