import { AudioEngine } from '../audio/AudioEngine';
import { Synth } from '../audio/Synth';
import { getLocale, t } from '../i18n/strings';
import { loadRunningSave, recordRestActivity } from './core/save';
import type { RestActivityId } from './core/journal';

export class RestCorner {
  private audio: AudioEngine | null = null;
  private synth: Synth | null = null;
  private timer: number | null = null;
  constructor(private readonly root: HTMLElement, private readonly onBack: () => void) { this.showMenu(); }

  private showMenu(): void {
    this.stopActivity();
    const zh = getLocale() === 'zh-CN';
    this.root.replaceChildren();
    this.root.scrollTop = 0;
    this.root.style.cssText = 'width:100vw;height:100vh;overflow:auto;background:radial-gradient(circle at 50% 30%,#173f36,#071512 70%);color:#fff;font-family:system-ui;';
    const page = document.createElement('main'); page.dataset.role = 'rest-corner';
    page.style.cssText = 'width:min(760px,calc(100% - 28px));min-height:100%;margin:auto;padding:max(20px,env(safe-area-inset-top)) 0 max(32px,env(safe-area-inset-bottom));display:flex;flex-direction:column;justify-content:center;';
    const card = (id: RestActivityId, icon: string, title: string, detail: string) => `<button data-activity="${id}" style="min-height:132px;padding:20px;border:1px solid #5b8c7c;border-radius:20px;background:#102c25;color:#fff;text-align:left"><span style="font-size:34px">${icon}</span><strong style="display:block;font-size:21px;margin-top:7px">${title}</strong><span style="display:block;color:#bcd0c9;margin-top:6px">${detail}</span></button>`;
    page.innerHTML = `<button data-role="back" style="align-self:flex-start;border:0;background:transparent;color:#cce0d9;font-size:16px">← ${t('menu.back')}</button><h1 style="font-size:clamp(36px,8vw,52px);margin:28px 0 4px">${zh ? '休息角' : 'Rest Corner'}</h1><p style="color:#bcd0c9;line-height:1.5">${zh ? '三个可选的安静活动。没有失败、连胜或需要刷取的奖励。' : 'Three optional calm activities. No failure, streaks, or rewards to grind.'}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:13px;margin-top:24px">${card('breathingRing','◌',zh?'呼吸环':'Breathing Ring',zh?'轻按开始，跟随缓慢扩张与收缩约 30 秒。':'Tap to begin and follow a slow 30-second cycle.')}${card('lightPlacement','✦',zh?'光点摆放':'Light Placement',zh?'依次放置四个光点，形成柔和轨道。':'Place four lights into a gentle orbit.')}${card('soundGarden','♫',zh?'声音花园':'Sound Garden',zh?'触碰五个音点，组成没有错音的和声。':'Touch five tone points; there are no wrong notes.')}</div>`;
    page.querySelector('[data-role="back"]')!.addEventListener('click', () => { this.stopActivity(); this.onBack(); });
    for (const button of page.querySelectorAll<HTMLButtonElement>('[data-activity]')) button.addEventListener('click', () => this.launch(button.dataset.activity as RestActivityId));
    this.root.appendChild(page);
    this.root.scrollTop = 0;
  }

  private launch(activity: RestActivityId): void {
    if (activity === 'breathingRing') this.breathing(); else if (activity === 'lightPlacement') this.lights(); else this.soundGarden();
  }

  private shell(title: string, detail: string): HTMLElement {
    this.stopActivity(); this.root.replaceChildren();
    this.root.scrollTop = 0;
    const main = document.createElement('main'); main.dataset.role = 'rest-activity';
    main.style.cssText = 'width:100%;height:100%;display:grid;grid-template-rows:auto 1fr auto;place-items:center;padding:20px;box-sizing:border-box;text-align:center;';
    main.innerHTML = `<button data-role="activity-back" style="justify-self:start;border:0;background:transparent;color:#cce0d9;font-size:16px">← ${t('menu.back')}</button><section><h1>${title}</h1><p style="color:#bcd0c9">${detail}</p><div data-role="activity-space" style="position:relative;width:min(78vw,440px);height:min(58vh,440px);margin:20px auto"></div><output data-role="activity-status" style="color:#a7e5c8"></output></section><small style="color:#78968c">${getLocale()==='zh-CN'?'这是一段可选游戏活动，不是医疗干预。':'An optional game activity, not a medical intervention.'}</small>`;
    main.querySelector('[data-role="activity-back"]')!.addEventListener('click', () => this.showMenu());
    this.root.appendChild(main); this.root.scrollTop = 0; return main;
  }

  private breathing(): void {
    const zh = getLocale() === 'zh-CN'; const page = this.shell(zh ? '呼吸环' : 'Breathing Ring', zh ? '轻按圆环开始。舒适地跟随即可，不需要精确。' : 'Tap the ring to begin. Follow comfortably; precision is not scored.');
    const space = page.querySelector<HTMLElement>('[data-role="activity-space"]')!;
    const ring = document.createElement('button'); ring.dataset.role = 'breathing-ring'; ring.style.cssText = 'position:absolute;left:50%;top:50%;width:150px;height:150px;transform:translate(-50%,-50%);border:5px solid #8ddfbd;border-radius:50%;background:#4aa77c22;color:#fff;font-size:18px;transition:transform 4s ease-in-out;'; ring.textContent = zh ? '开始' : 'Begin'; space.appendChild(ring);
    ring.addEventListener('click', () => {
      if (ring.dataset.started) return; ring.dataset.started = 'true'; ring.textContent = zh ? '慢慢跟随' : 'Follow gently'; let expanded = false;
      const pulse = () => { expanded = !expanded; ring.style.transform = `translate(-50%,-50%) scale(${expanded ? 1.65 : .82})`; };
      pulse(); this.timer = window.setInterval(pulse, 4000);
      window.setTimeout(() => { if (!ring.isConnected) return; this.complete('breathingRing', page); }, 30_000);
    });
  }

  private lights(): void {
    const zh = getLocale() === 'zh-CN'; const page = this.shell(zh ? '光点摆放' : 'Light Placement', zh ? '依次轻触光点，把它们放进轨道。' : 'Touch each light to place it into the orbit.');
    const space = page.querySelector<HTMLElement>('[data-role="activity-space"]')!; let placed = 0;
    const positions = [[50,12],[86,50],[50,86],[14,50]];
    for (let index=0; index<4; index+=1) { const light=document.createElement('button'); light.dataset.role='light-point'; light.style.cssText=`position:absolute;left:${20+index*20}%;top:48%;width:46px;height:46px;border-radius:50%;border:2px solid #ffe59a;background:#d4b84b55;color:#fff;transition:left .6s ease,top .6s ease,box-shadow .6s`; light.textContent='✦'; light.addEventListener('click',()=>{ if(light.dataset.placed)return; light.dataset.placed='true'; light.style.left=`${positions[index]![0]}%`;light.style.top=`${positions[index]![1]}%`;light.style.boxShadow='0 0 28px #ffe59a';placed+=1;if(placed===4)this.complete('lightPlacement',page);});space.appendChild(light); }
    const orbit=document.createElement('div');orbit.style.cssText='position:absolute;left:15%;top:15%;width:70%;height:70%;border:2px solid #8ddfbd55;border-radius:50%;pointer-events:none';space.prepend(orbit);
  }

  private soundGarden(): void {
    const zh = getLocale() === 'zh-CN'; const page = this.shell(zh ? '声音花园' : 'Sound Garden', zh ? '任意顺序触碰五个音点。没有错音。' : 'Touch the five tone points in any order. There are no wrong notes.');
    const space = page.querySelector<HTMLElement>('[data-role="activity-space"]')!; const touched=new Set<number>(); const notes=[220,277,330,440,554];
    for(let index=0;index<5;index+=1){const tone=document.createElement('button');tone.dataset.role='tone-point';tone.style.cssText=`position:absolute;left:${12+index*18}%;top:${38+Math.sin(index*1.7)*24}%;width:54px;height:54px;border-radius:${index%2?'10px':'50%'};border:2px solid #9fd9ff;background:#315b7244;color:#fff`;tone.textContent=['●','◇','△','○','◆'][index]!;tone.addEventListener('click',async()=>{if(!this.audio){this.audio=new AudioEngine({musicVolume:.18,sfxVolume:.35});this.synth=new Synth(this.audio);await this.audio.unlockFromUserGesture();}const style=loadRunningSave().musicStyle;this.synth?.play(style==='chiptune'?'lead':style==='organic'?'bell':index%2?'bell':'pluck',this.audio.now()+.01,notes[index],.45,style==='chiptune'?.14:.22);touched.add(index);tone.style.background='#7fc7a877';tone.style.boxShadow='0 0 24px #9fd9ff';if(touched.size===5)this.complete('soundGarden',page);});space.appendChild(tone);}
  }

  private complete(activity: RestActivityId, page: HTMLElement): void { if (page.dataset.complete) return; page.dataset.complete='true'; recordRestActivity(activity); const output=page.querySelector<HTMLOutputElement>('[data-role="activity-status"]')!; output.textContent=getLocale()==='zh-CN'?'完成 · 这一小段安静已记入生涯档案':'Complete · This small pause is remembered in the Journal'; }
  private stopActivity(): void { if(this.timer!==null){window.clearInterval(this.timer);this.timer=null;} if(this.audio){void this.audio.close();this.audio=null;this.synth=null;} }
}
