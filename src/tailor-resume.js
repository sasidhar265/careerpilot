import {scoreResume} from './ats-score.js';
export const ATS_TARGET=80;
export async function tailorResume(payload,request,onRefine=()=>{}){
 const baseline=scoreResume(payload.previousDraft||payload.resume,payload.job).score;
 let result=await request('rewrite',payload);
 const initial=scoreResume(result.updatedResume,payload.job);
 if(payload.atsFriendly!==false&&initial.score!==null&&initial.score<Math.max(ATS_TARGET,baseline??0)){
 onRefine(initial);
 try{
 const refined=await request('rewrite',{...payload,previousDraft:result.updatedResume});
 const score=scoreResume(refined.updatedResume,payload.job).score;
 if(score!==null&&score>=initial.score)result=refined;
 }catch{
 result={...result,reviewNotes:[...(result.reviewNotes||[]),'The additional ATS improvement pass could not complete. Review the saved draft and remaining gaps.']};
 }
 }
 if(payload.atsFriendly!==false&&baseline!==null&&scoreResume(result.updatedResume,payload.job).score<baseline)throw new Error(`The generated draft scored below your existing resume (${baseline}/100). Your current resume was kept. Accepted changes remain selected; review missing facts and retry.`);
 const accepted=[...(payload.suggestions||[]),...(payload.selectedPriorities||[])];
 return {...result,reviewNotes:[...(result.reviewNotes||[]),...accepted.map(change=>`Accepted tailoring request: ${change.title}. ${change.detail}`)]};
}
