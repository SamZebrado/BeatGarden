import { getLocale } from '../i18n/strings';
import { STORY_MARKS, achievement, type JourneyRecordV1 } from './core/journal';

export class JourneyResult {
  private readonly element: HTMLElement;
  constructor(root: HTMLElement, private readonly textOff = false) {
    this.element = document.createElement('aside');
    this.element.dataset.role = 'journey-result';
    this.element.style.cssText = 'display:none;position:fixed;z-index:57;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,calc(100% - 28px));max-height:min(72vh,620px);overflow:auto;padding:22px;border:1px solid #d8c875;border-radius:22px;background:#0d201beF;color:#fff;font:15px system-ui;box-shadow:0 22px 80px #000b;pointer-events:auto;';
    root.appendChild(this.element);
  }
  show(record: JourneyRecordV1): void {
    const locale = getLocale(); const zh = locale === 'zh-CN';
    const medals = record.medalsUnlocked.length ? record.medalsUnlocked.map((id) => `<span style="display:inline-flex;gap:5px;padding:7px 10px;border:1px solid #d8c875;border-radius:999px">${achievement(id).icon} ${achievement(id).title[locale]}</span>`).join('') : `<span style="color:#94aaa3">${zh ? '本次没有新勋章' : 'No new medals this run'}</span>`;
    const marks = record.storyMarks.length ? record.storyMarks.map((id) => `<span style="display:inline-flex;gap:5px;padding:7px 10px;border:1px solid #7ccaaa;border-radius:999px">${STORY_MARKS[id].icon} ${STORY_MARKS[id].title[locale]}</span>`).join('') : `<span style="color:#94aaa3">${zh ? '本次没有新故事印记' : 'No new Story Marks this run'}</span>`;
    this.element.innerHTML = this.textOff ? `<div aria-label="${zh ? '旅程完成' : 'Journey Complete'}" style="font-size:46px">✦ ✓</div><div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:16px">${record.medalsUnlocked.map((id)=>achievement(id).icon).join(' ')} ${record.storyMarks.map((id)=>STORY_MARKS[id].icon).join(' ')}</div><button data-role="dismiss-result" aria-label="${zh ? '关闭结算' : 'Close result'}" style="margin-top:18px;padding:10px 18px;border:1px solid #709b8c;border-radius:999px;background:#17372e;color:#fff">×</button>` : `<div style="font-size:34px">✦</div><h2 style="font-size:28px;margin:6px 0">${zh ? '旅程完成' : 'Journey Complete'}</h2><p style="color:#c6dbd3">${record.finalStage} · ${Math.round(record.runDuration)}s · ${record.personCode ?? '—'}</p><h3>${zh ? '新勋章' : 'New Medals'}</h3><div style="display:flex;gap:7px;flex-wrap:wrap">${medals}</div><h3>${zh ? '故事印记' : 'Story Marks'}</h3><div style="display:flex;gap:7px;flex-wrap:wrap">${marks}</div><button data-role="dismiss-result" style="margin-top:18px;padding:10px 16px;border:1px solid #709b8c;border-radius:999px;background:#17372e;color:#fff">${zh ? '查看花园结局' : 'View garden ending'}</button>`;
    this.element.querySelector('[data-role="dismiss-result"]')!.addEventListener('click', () => { this.element.style.display = 'none'; });
    this.element.style.display = 'block';
  }
  hide(): void { this.element.style.display = 'none'; }
  destroy(): void { this.element.remove(); }
}
