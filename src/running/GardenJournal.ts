import { getLocale, t } from '../i18n/strings';
import { ACHIEVEMENTS, STORY_MARKS, achievement, type JourneyRecordV1 } from './core/journal';
import { loadRunningSave } from './core/save';

export class GardenJournal {
  constructor(private readonly root: HTMLElement, private readonly onBack: () => void) { this.render(); }

  private render(): void {
    const save = loadRunningSave();
    const locale = getLocale();
    const zh = locale === 'zh-CN';
    this.root.replaceChildren();
    this.root.scrollTop = 0;
    this.root.style.cssText = 'display:block;width:100vw;height:100vh;overflow-x:hidden;overflow-y:auto;background:radial-gradient(circle at 50% 0%,#183c34,#071512 70%);color:#fff;font-family:system-ui;';
    const page = document.createElement('main');
    page.dataset.role = 'garden-journal';
    page.style.cssText = 'width:min(900px,calc(100% - 28px));margin:0 auto;padding:max(20px,env(safe-area-inset-top)) 0 max(36px,env(safe-area-inset-bottom));';
    const records = [...save.journeyHistory].reverse();
    const history = records.length ? records.map((record) => historyCard(record, zh)).join('') : `<p style="color:#a9c5bc">${zh ? '完成一段人生旅程后，它会在这里留下简短记录。' : 'A completed life-path journey will leave a compact record here.'}</p>`;
    const medals = ACHIEVEMENTS.map((item) => {
      const unlocked = save.achievements.includes(item.id);
      return `<article data-medal="${item.id}" data-unlocked="${unlocked}" style="padding:14px;border:1px solid ${unlocked ? '#d9c86d' : '#3b554d'};border-radius:16px;background:${unlocked ? '#283725' : '#10231f'};opacity:${unlocked ? 1 : .58}"><span style="font-size:27px">${item.icon}</span><strong style="display:block;margin-top:5px">${item.title[locale]}</strong><small style="display:block;margin-top:5px;color:#bcd0c9;line-height:1.4">${unlocked ? item.detail[locale] : (zh ? '尚未解锁' : 'Locked')}</small></article>`;
    }).join('');
    const marks = Object.entries(STORY_MARKS).map(([id, mark]) => {
      const present = save.storyMarks.includes(id as keyof typeof STORY_MARKS);
      return `<span data-story-mark="${id}" data-earned="${present}" style="display:inline-flex;gap:7px;align-items:center;padding:9px 12px;border:1px solid ${present ? '#8dd7ba' : '#3b554d'};border-radius:999px;color:${present ? '#e8fff4' : '#708a81'}">${mark.icon} ${mark.title[locale]}</span>`;
    }).join('');
    page.innerHTML = `<button data-role="back" style="padding:10px 14px;border:0;background:transparent;color:#cce0d9;font-size:16px">← ${t('menu.back')}</button><header style="margin:24px 0 28px"><div style="font-size:42px">📖</div><h1 style="font-size:clamp(34px,8vw,52px);margin:8px 0">${zh ? '生涯档案' : 'Garden Journal'}</h1><p style="color:#bcd0c9">${zh ? `${records.length} 段旅程 · ${save.achievements.length}/${ACHIEVEMENTS.length} 枚勋章 · ${save.storyMarks.length} 个故事印记` : `${records.length} journeys · ${save.achievements.length}/${ACHIEVEMENTS.length} medals · ${save.storyMarks.length} Story Marks`}</p></header>
      <section aria-labelledby="history-title"><h2 id="history-title">${zh ? '游玩历史' : 'Run History'}</h2><div style="display:grid;gap:12px">${history}</div></section>
      <section aria-labelledby="medals-title" style="margin-top:34px"><h2 id="medals-title">${zh ? '成就勋章' : 'Medals'}</h2><p style="color:#a9c5bc">${zh ? '勋章只改变表达与纪念，不提供永久战斗数值。' : 'Medals are expressive only and never grant permanent combat power.'}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:10px;margin-top:14px">${medals}</div></section>
      <section aria-labelledby="marks-title" style="margin-top:34px"><h2 id="marks-title">${zh ? '故事印记' : 'Story Marks'}</h2><p style="color:#a9c5bc">${zh ? '记录有趣经历，不代表游戏对选择作出道德评分。' : 'Interesting events, not moral grades for your choices.'}</p><div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:14px">${marks}</div></section>`;
    page.querySelector('[data-role="back"]')!.addEventListener('click', () => this.onBack());
    this.root.appendChild(page);
    this.root.scrollTop = 0;
  }
}

function historyCard(record: JourneyRecordV1, zh: boolean): string {
  const locale = zh ? 'zh-CN' : 'en';
  const marks = record.storyMarks.map((id) => `${STORY_MARKS[id].icon} ${STORY_MARKS[id].title[locale]}`).join(' · ');
  const medals = record.medalsUnlocked.map((id) => `${achievement(id).icon} ${achievement(id).title[locale]}`).join(' · ');
  const personCode = escapeHtml(record.personCode ?? (zh ? '无固定导师 / 经理' : 'No fixed mentor / manager'));
  const finalStage = escapeHtml(record.finalStage);
  return `<article data-record-id="${record.recordId}" style="padding:17px;border:1px solid #456b5e;border-radius:18px;background:#10231f"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><strong>${worldLabel(record.world, zh)} · ${difficultyLabel(record.difficulty, zh)}</strong><time style="color:#91ada3">${record.completedAt.slice(0, 10)}</time></div><div style="margin-top:8px;color:#cce0d9">${personCode} · ${Math.round(record.runDuration)}s · ${finalStage}</div>${marks ? `<div style="margin-top:9px;color:#a8e4c8">${marks}</div>` : ''}${medals ? `<div style="margin-top:7px;color:#f0dc89">${medals}</div>` : ''}</article>`;
}
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!); }
function worldLabel(world: JourneyRecordV1['world'], zh: boolean): string { return zh ? ({ phd: '博士花园', master: '硕士花园', work: '工作花园' } as const)[world] : ({ phd: 'PhD Garden', master: 'Master Garden', work: 'Work Garden' } as const)[world]; }
function difficultyLabel(value: JourneyRecordV1['difficulty'], zh: boolean): string { return zh ? ({ sprout: '新芽', garden: '花园', storm: '风暴' } as const)[value] : ({ sprout: 'Sprout', garden: 'Garden', storm: 'Storm' } as const)[value]; }
