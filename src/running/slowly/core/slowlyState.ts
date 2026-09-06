export {FEELING_IDS,NEED_IDS,SLOWLY_PHASES,STRATEGY_IDS,isSlowlyJourneyStateV1} from '../../core/slowlySchema';
export type {CompanionKind,SlowlyCompanionV1,SlowlyJourneyStateV1,SlowlyOutcome,SlowlyPhase} from '../../core/slowlySchema';
import type {SlowlyJourneyStateV1} from '../../core/slowlySchema';
export function createSlowlyState(now=Date.now(),runId=newSlowlyRunId(now)):SlowlyJourneyStateV1{return {version:1,runId,phase:'situation',recordOrigin:null,endingMode:'normal',summaryDraft:'',selectedFeelings:[],selectedNeeds:[],companion:null,companionDraftKind:null,expressionKind:'none',action:null,keepPrivateText:false,startedAt:now,updatedAt:now};}
function newSlowlyRunId(now:number):string{const random=globalThis.crypto?.randomUUID?.().replace(/-/g,'').slice(0,16)??Math.random().toString(36).slice(2,14);return `slowly-${Math.floor(now).toString(36)}-${random}`;}
