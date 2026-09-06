import { getLocale } from '../../i18n/strings';
import { clearCurrentRun, saveCurrentRun, type CurrentRunV1 } from '../core/currentRun';
import { recordSlowlyReflection } from '../core/save';
import { boundedPrivateText, deletePrivateRecord, readPrivateRecord, writePrivateRecord, type SlowlyPrivateRecordV1 } from './core/slowlyPersistence';
import { createSlowlyState, type CompanionKind, type SlowlyJourneyStateV1 } from './core/slowlyState';
import { FEELINGS, NEEDS, type SlowlyWord } from './core/slowlyVocabulary';

type SlowlyRun = Extract<CurrentRunV1, { world: 'slowly' }>;
type Copy = Record<string, string>;

const COPY: Record<'zh'|'en', Copy> = {
  zh: { title:'慢慢岛', subtitle:'把整理自己的过程，变成一段可以走过的空间。', back:'返回', next:'继续', skip:'跳过', enough:'今天到这里', more:'更多候选', showAll:'显示全部', undo:'撤销', feelings:'此刻哪些感受比较扎眼？', needs:'它们可能指向什么需要？', noAnswer:'没有标准答案；选择、跳过或停下都可以。', situation:'先把发生的事放在这里', situationHint:'可选。文字属于你，BeatGarden 不会替你判断。', keep:'在这台设备上保留我的私人文字', distill:'留下一个可同行的同伴', companion:'同伴只在慢慢岛提醒你，不提供任何数值增益。', mirror:'对自己说', bridge:'向别人表达', none:'暂不写', expression:'形成自己的表达', action:'现在怎样对自己更合适？', smallStep:'做一点', request:'提出请求 / 求助', letGo:'先放下', rest:'先休息', record:'留下简短记录', summary:'可选的档案摘要（私人正文不会出现在这里）', finish:'保存记录', done:'这段路已经放下来了。', again:'再走一次', saveDraft:'保存草稿', discard:'丢弃草稿', stay:'留在这里', exitQuestion:'要怎样处理这段尚未结束的旅程？', privacy:'私人文字默认不保存，也不会进入普通导出、Boss、日志或审阅附件。', visual:'场景变安静是游戏表达，不保证现实情绪会减弱。', need:'需要', strategy:'策略', insight:'领悟' },
  en: { title:'Slowly Island', subtitle:'Turn reflection into a place you can walk through.', back:'Back', next:'Continue', skip:'Skip', enough:'Today is enough', more:'More candidates', showAll:'Show all', undo:'Undo', feelings:'Which feelings stand out right now?', needs:'What might they be pointing toward?', noAnswer:'There is no correct answer. Choose, skip, or stop.', situation:'Set down what happened', situationHint:'Optional. Your words remain yours; BeatGarden does not judge them.', keep:'Keep my private text on this device', distill:'Leave with one companion', companion:'A companion stays within Slowly Island and grants no stat benefit.', mirror:'Speak to myself', bridge:'Draft for someone else', none:'Not now', expression:'Shape your own words', action:'What would fit you now?', smallStep:'Do one small thing', request:'Ask / seek support', letGo:'Let it rest', rest:'Rest first', record:'Leave a compact record', summary:'Optional Journal summary (private text is excluded)', finish:'Save record', done:'This part of the path has been set down.', again:'Walk again', saveDraft:'Save draft', discard:'Discard draft', stay:'Stay here', exitQuestion:'What should happen to this unfinished journey?', privacy:'Private text is not saved by default and never enters ordinary exports, Bosses, logs, or review attachments.', visual:'A quieter scene is a game metaphor, not a promise that real feelings will lessen.', need:'Need', strategy:'Strategy', insight:'Insight' },
};

export class SlowlyIslandHost {
  private state: SlowlyJourneyStateV1;
  private privateText: SlowlyPrivateRecordV1;
  private showAll = { feelings: false, needs: false };
  private previousSelection: { key: 'selectedFeelings' | 'selectedNeeds'; values: string[] } | null = null;
  private abandoned = false;
  private destroyed = false;

  constructor(private readonly root: HTMLElement, private readonly onExit: () => void, resume?: SlowlyRun) {
    this.state = resume ? structuredClone(resume.simulation) : createSlowlyState();
    this.privateText = readPrivateRecord(this.runId) ?? { version:1, id:this.runId, situation:'', mirror:'', bridge:'', companionPrompt:'', updatedAt:Date.now() };
    this.render();
  }

  saveNow(): void { if (this.destroyed || this.abandoned || this.state.phase === 'ended') return; this.persistDraft(); }
  destroy(): void { if (this.destroyed) return; this.saveNow(); this.destroyed = true; this.root.replaceChildren(); }

  private get c(): Copy { return COPY[getLocale() === 'zh-CN' ? 'zh' : 'en']; }
  private get runId(): string { return this.state.runId; }
  private render(): void {
    this.root.replaceChildren();
    this.root.style.cssText='width:100vw;height:100vh;overflow:auto;background:radial-gradient(circle at 50% 15%,#235348,#071512 72%);color:#fff;font-family:system-ui;';
    const main=document.createElement('main'); main.dataset.role='slowly-island'; main.dataset.phase=this.state.phase;
    main.style.cssText='width:min(980px,calc(100% - 28px));min-height:100%;margin:auto;padding:max(18px,env(safe-area-inset-top)) 0 max(30px,env(safe-area-inset-bottom));box-sizing:border-box;';
    const style=document.createElement('style'); style.textContent='[data-role^="feelings-"] ,[data-role^="needs-"]{transition:opacity 900ms ease,border-color 180ms ease}@media (prefers-reduced-motion:reduce){[data-role^="feelings-"] ,[data-role^="needs-"]{transition:none!important}}'; main.append(style);
    const header=document.createElement('header'); header.style.cssText='display:flex;justify-content:space-between;align-items:center;gap:12px;';
    header.append(this.button(`← ${this.c.back}`,()=>this.exitFlow(),'back'));
    if(this.state.phase!=='record'&&this.state.phase!=='ended')header.append(this.button(this.c.enough,()=>this.enterRecord(this.state.phase,'early'),'enough'));main.append(header);
    const intro=document.createElement('section'); intro.innerHTML=`<div aria-hidden="true" style="font-size:42px;margin-top:24px">◌ ◇ ○</div>`;
    const h=document.createElement('h1'); h.textContent=this.c.title; h.style.cssText='font-size:clamp(36px,8vw,60px);margin:8px 0;'; intro.append(h);
    const sub=document.createElement('p'); sub.textContent=this.c.subtitle; sub.style.cssText='color:#cce0d9;line-height:1.5;margin:0 0 24px;'; intro.append(sub); main.append(intro);
    if(this.state.phase==='situation') this.renderSituation(main);
    else if(this.state.phase==='feelings') this.renderField(main,FEELINGS,'feelings','selectedFeelings');
    else if(this.state.phase==='needs') this.renderField(main,NEEDS,'needs','selectedNeeds');
    else if(this.state.phase==='distill') this.renderDistill(main);
    else if(this.state.phase==='expression') this.renderExpression(main);
    else if(this.state.phase==='action') this.renderAction(main);
    else if(this.state.phase==='optionalRest') this.renderRest(main);
    else if(this.state.phase==='record') this.renderRecord(main);
    else this.renderEnded(main);
    this.root.append(main);
  }

  private renderSituation(main:HTMLElement):void {
    main.append(this.heading(this.c.situation),this.note(this.c.situationHint));
    const area=document.createElement('textarea'); area.value=this.privateText.situation; area.maxLength=4000; area.dataset.role='situation-text'; area.style.cssText='width:100%;min-height:150px;margin-top:14px;padding:16px;border:1px solid #71988b;border-radius:18px;background:#10231f;color:#fff;font:17px/1.5 system-ui;box-sizing:border-box;';
    area.setAttribute('aria-label',this.c.situation);area.addEventListener('input',()=>{this.privateText.situation=boundedPrivateText(area.value);}); main.append(area);
    const label=document.createElement('label'); label.style.cssText='display:flex;gap:10px;align-items:flex-start;margin-top:14px;color:#cce0d9;'; const check=document.createElement('input'); check.type='checkbox'; check.checked=this.state.keepPrivateText; check.addEventListener('change',()=>{this.state.keepPrivateText=check.checked;if(!check.checked)deletePrivateRecord(this.runId);}); label.append(check,document.createTextNode(this.c.keep)); main.append(label,this.note(this.c.privacy),this.actions([this.button(this.c.skip,()=>this.go('feelings')),this.button(this.c.next,()=>this.go('feelings'),'next',true)]));
  }

  private renderField(main:HTMLElement,words:readonly SlowlyWord[],copyKey:'feelings'|'needs',stateKey:'selectedFeelings'|'selectedNeeds'):void {
    main.append(this.heading(this.c[copyKey]),this.note(`${this.c.noAnswer} ${copyKey==='feelings'?this.c.visual:''}`));
    const selected=this.state[stateKey]; const phone=window.matchMedia?.('(max-width: 520px)').matches===true; const limit=this.showAll[copyKey]?words.length:(phone?18:36);
    const field=document.createElement('div'); field.dataset.role=`${copyKey}-field`; field.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin:28px auto;max-width:900px;';
    for(const word of words.slice(0,limit)){const active=selected.includes(word.id);const b=this.button(getLocale()==='zh-CN'?word.zh:word.en,()=>{const next=active?selected.filter(id=>id!==word.id):selected.length<3?[...selected,word.id]:selected;if(next!==selected){this.previousSelection={key:stateKey,values:[...selected]};this.state[stateKey]=next;}this.render();},`${copyKey}-${word.id}`);b.setAttribute('aria-pressed',String(active));b.style.cssText+=`min-height:44px;border-color:${active?'#d9e978':'#557b70'};background:${active?'#36553b':selected.length?'#10231faa':'#173b32'};opacity:${active||!selected.length?1:.68};`;field.append(b);} main.append(field);
    if(limit<words.length)main.append(this.button(selected.length?this.c.showAll:this.c.more,()=>{this.showAll[copyKey]=true;this.render();},'more'));
    const tray=document.createElement('div'); tray.dataset.role='selection-tray'; tray.style.cssText='min-height:48px;margin-top:16px;color:#d9efdf;'; for(const id of selected){const word=words.find(w=>w.id===id);if(!word)continue;tray.append(this.button(`× ${getLocale()==='zh-CN'?word.zh:word.en}`,()=>{this.previousSelection={key:stateKey,values:[...selected]};this.state[stateKey]=selected.filter(item=>item!==id);this.renderAndFocus(`[data-role="${copyKey}-${id}"]`);},`remove-${id}`));} main.append(tray);
    const previous=copyKey==='feelings'?'situation':'feelings'; const next=copyKey==='feelings'?'needs':'distill'; const controls=[this.button(this.c.back,()=>this.go(previous),'field-back')];if(this.previousSelection?.key===stateKey)controls.push(this.button(this.c.undo,()=>{this.state[stateKey]=this.previousSelection!.values;this.previousSelection=null;this.renderAndFocus('[data-role="selection-tray"] button, [data-role^="'+copyKey+'-"]');},'undo'));controls.push(this.button(this.c.skip,()=>{this.state[stateKey]=[];this.go(next);}),this.button(this.c.next,()=>this.go(next),'next',true));main.append(this.actions(controls));
  }

  private renderDistill(main:HTMLElement):void {
    main.append(this.heading(this.c.distill),this.note(this.c.companion));
    if(this.state.companionDraftKind===null){const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:22px;';for(const kind of ['need','strategy','insight'] as CompanionKind[])row.append(this.button(this.c[kind],()=>{this.state.companionDraftKind=kind;this.renderAndFocus('[data-role="distill-choice"]');},`companion-${kind}`,true));main.append(row);}
    else this.renderCompanionConfirmation(main,this.state.companionDraftKind);
    main.append(this.actions([this.button(this.c.back,()=>{if(this.state.companionDraftKind){this.state.companionDraftKind=null;this.renderAndFocus('[data-role="companion-need"]');}else this.go('needs');}),this.button(this.c.skip,()=>{this.state.companion=null;this.state.companionDraftKind=null;this.go('expression');})]));
  }
  private renderCompanionConfirmation(main:HTMLElement,kind:CompanionKind):void {
    const row=document.createElement('div');row.dataset.role='distill-choice';row.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;';
    if(kind==='need'){for(const id of this.state.selectedNeeds){const word=NEEDS.find(item=>item.id===id);if(word)row.append(this.button(getLocale()==='zh-CN'?word.zh:word.en,()=>this.confirmCompanion(kind,id,[id]),`confirm-need-${id}`,true));}if(!row.childElementCount)row.append(this.note(this.c.noAnswer));}
    else if(kind==='strategy'){const options=[['small-step',this.c.smallStep],['ask-question',getLocale()==='zh-CN'?'问一个问题':'Ask one question'],['request-support',this.c.request],['pause',getLocale()==='zh-CN'?'暂停一下':'Pause'],['rest',this.c.rest]];for(const [id,label] of options)row.append(this.button(label,()=>this.confirmCompanion(kind,id,[id]),`confirm-strategy-${id}`,true));}
    else {const area=document.createElement('textarea');area.value=this.privateText.companionPrompt;area.maxLength=4000;area.setAttribute('aria-label',getLocale()==='zh-CN'?'写下一点观察':'Write one observation');area.style.cssText='width:100%;min-height:110px;padding:16px;border:1px solid #71988b;border-radius:18px;background:#10231f;color:#fff;font:17px/1.5 system-ui;box-sizing:border-box;';area.addEventListener('input',()=>{this.privateText.companionPrompt=boundedPrivateText(area.value);});row.append(area,this.button(this.c.next,()=>{if(this.privateText.companionPrompt.trim())this.confirmCompanion(kind,'authored-insight',this.state.selectedFeelings);},'confirm-insight',true));}
    main.append(row);
  }
  private confirmCompanion(kind:CompanionKind,labelId:string,sourceIds:string[]):void { this.state.companion={id:`companion-${this.runId}`,kind,sourceIds:[...sourceIds],labelId,presentationId:kind==='need'?'ring':kind==='strategy'?'prism':'paired-dots'};this.state.companionDraftKind=null;this.go('expression'); }
  private renderExpression(main:HTMLElement):void { main.append(this.heading(this.c.expression)); const choices=document.createElement('div'); choices.style.cssText='display:flex;gap:10px;flex-wrap:wrap;'; for(const kind of ['mirror','bridge','none'] as const)choices.append(this.button(this.c[kind],()=>{this.state.expressionKind=kind;this.render();},`expression-${kind}`)); main.append(choices); if(this.state.expressionKind!=='none'){const area=document.createElement('textarea'); const key=this.state.expressionKind;area.value=this.privateText[key];area.maxLength=4000;area.setAttribute('aria-label',this.c[key]);area.style.cssText='width:100%;min-height:130px;margin-top:18px;padding:16px;border:1px solid #71988b;border-radius:18px;background:#10231f;color:#fff;font:17px/1.5 system-ui;box-sizing:border-box;';area.addEventListener('input',()=>{this.privateText[key]=boundedPrivateText(area.value);});main.append(area);} main.append(this.actions([this.button(this.c.back,()=>this.go('distill')),this.button(this.c.next,()=>this.go('action'),'next',true)])); }
  private renderAction(main:HTMLElement):void { main.append(this.heading(this.c.action)); const actions=[['small-step','smallStep'],['request-support','request'],['let-go','letGo'],['rest','rest'],['enough','enough']] as const; const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:24px;';for(const [id,label] of actions)row.append(this.button(this.c[label],()=>{this.state.action=id;if(id==='rest')this.go('optionalRest');else this.enterRecord('action',id==='enough'?'early':'normal');},`action-${id}`,true));main.append(row,this.actions([this.button(this.c.back,()=>this.go('expression'))])); }
  private renderRest(main:HTMLElement):void { main.append(this.heading(this.c.rest)); const calm=document.createElement('div');calm.setAttribute('aria-label',this.c.rest);calm.style.cssText='width:min(260px,70vw);aspect-ratio:1;border:2px solid #91d6bc;border-radius:50%;margin:34px auto;box-shadow:0 0 0 24px #75bd9c18,0 0 0 54px #75bd9c0d;';main.append(calm,this.note(this.c.visual),this.actions([this.button(this.c.back,()=>this.go('action')),this.button(this.c.next,()=>this.enterRecord('optionalRest','normal'),'next',true)])); }
  private renderRecord(main:HTMLElement):void { main.append(this.heading(this.c.record),this.note(this.c.privacy)); const area=document.createElement('textarea');area.maxLength=240;area.value=this.state.summaryDraft;area.dataset.role='reflection-summary';area.placeholder=this.c.summary;area.setAttribute('aria-label',this.c.summary);area.addEventListener('input',()=>{this.state.summaryDraft=[...boundedPrivateText(area.value)].slice(0,240).join('');});area.style.cssText='width:100%;min-height:110px;padding:16px;border:1px solid #71988b;border-radius:18px;background:#10231f;color:#fff;font:17px/1.5 system-ui;box-sizing:border-box;';const label=document.createElement('label');label.style.cssText='display:flex;gap:10px;align-items:flex-start;margin-top:14px;color:#cce0d9;';const check=document.createElement('input');check.type='checkbox';check.checked=this.state.keepPrivateText;check.addEventListener('change',()=>{this.state.keepPrivateText=check.checked;if(!check.checked)deletePrivateRecord(this.runId);});label.append(check,document.createTextNode(this.c.keep));main.append(area,label,this.actions([this.button(this.c.back,()=>this.go(this.state.recordOrigin??'action'),'record-back'),this.button(this.c.finish,()=>this.finish(area.value),'finish',true)])); }
  private renderEnded(main:HTMLElement):void { main.querySelector('[data-role="enough"]')?.remove();main.append(this.heading(this.c.done),this.actions([this.button(this.c.again,()=>{this.state=createSlowlyState();this.privateText={version:1,id:this.state.runId,situation:'',mirror:'',bridge:'',companionPrompt:'',updatedAt:Date.now()};this.showAll={feelings:false,needs:false};this.previousSelection=null;this.renderAndFocus('h2');},'again',true),this.button(this.c.back,this.onExit,'exit')])); }

  private finish(summary:string):void { const endedAt=new Date().toISOString();const cleanSummary=[...boundedPrivateText(summary.trim())].slice(0,240).join('');const record={schema:'beatgarden-reflection.v1' as const,recordId:this.runId,endedAt,outcome:this.state.endingMode==='early'?'ended-early' as const:'completed' as const,phaseReached:this.state.recordOrigin??'record',feelingIds:[...this.state.selectedFeelings],needIds:[...this.state.selectedNeeds],summary:cleanSummary||null,companion:this.state.companion?{kind:this.state.companion.kind,labelId:this.state.companion.labelId}:null,gameVersion:'0.1.0'};try{recordSlowlyReflection(record);if(this.state.keepPrivateText){this.privateText.updatedAt=Date.now();writePrivateRecord(this.privateText);}else deletePrivateRecord(this.runId);clearCurrentRun();this.state.phase='ended';this.render();}catch{this.persistDraft();}}
  private enterRecord(origin:SlowlyJourneyStateV1['phase'],mode:'normal'|'early'):void { this.state.recordOrigin=origin;this.state.endingMode=mode;this.go('record'); }
  private go(phase:SlowlyJourneyStateV1['phase']):void { this.state.phase=phase;if(phase!=='record'){this.state.recordOrigin=null;this.state.endingMode='normal';}this.state.updatedAt=Date.now();this.persistDraft();this.renderAndFocus('h2'); }
  private persistDraft():void { saveCurrentRun({version:2,status:'active',savedAt:Date.now(),seed:this.state.startedAt>>>0,world:'slowly',difficulty:null,simulation:this.state});if(this.state.keepPrivateText){this.privateText.updatedAt=Date.now();writePrivateRecord(this.privateText);}else deletePrivateRecord(this.runId); }
  private exitFlow():void { const existing=this.root.querySelector('[data-role="exit-dialog"]');if(existing)return;const dialog=document.createElement('section');dialog.dataset.role='exit-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.style.cssText='position:fixed;inset:0;z-index:90;display:grid;place-items:center;background:#000a;padding:20px;';const panel=document.createElement('div');panel.style.cssText='width:min(520px,100%);padding:24px;border:1px solid #71988b;border-radius:20px;background:#10231f;';panel.append(this.heading(this.c.exitQuestion),this.actions([this.button(this.c.saveDraft,()=>{this.persistDraft();this.onExit();},'save-draft',true),this.button(this.c.discard,()=>{this.abandoned=true;this.state.phase='ended';deletePrivateRecord(this.runId);clearCurrentRun();this.onExit();},'discard'),this.button(this.c.stay,()=>dialog.remove(),'stay')]));dialog.append(panel);this.root.append(dialog); }
  private renderAndFocus(selector:string):void { this.render();queueMicrotask(()=>this.root.querySelector<HTMLElement>(selector)?.focus()); }
  private heading(text:string):HTMLHeadingElement { const el=document.createElement('h2');el.textContent=text;el.tabIndex=-1;el.style.cssText='font-size:clamp(25px,5vw,38px);margin:18px 0 8px;';return el; }
  private note(text:string):HTMLParagraphElement { const el=document.createElement('p');el.textContent=text;el.style.cssText='color:#bcd2ca;line-height:1.55;';return el; }
  private actions(items:HTMLElement[]):HTMLDivElement { const el=document.createElement('div');el.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;';el.append(...items);return el; }
  private button(text:string,onClick:()=>void,role?:string,primary=false):HTMLButtonElement { const el=document.createElement('button');el.type='button';el.textContent=text;if(role)el.dataset.role=role;el.style.cssText=`min-height:44px;padding:10px 16px;border:1px solid ${primary?'#9ee8bd':'#63897c'};border-radius:999px;background:${primary?'#256047':'#10231f'};color:#fff;font:600 15px system-ui;cursor:pointer;touch-action:manipulation;`;el.addEventListener('click',onClick);return el; }
}
