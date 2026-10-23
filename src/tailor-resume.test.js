import {test} from 'node:test';
import assert from 'node:assert/strict';
import {tailorResume} from './tailor-resume.js';
import {prepare} from '../server/ai.js';
const original='Alex Example\nalex@example.com\n\nCORE SKILLS\nTesting\n\nPROFESSIONAL EXPERIENCE\nTester | Example | 2020–2024\n- Tested releases.';
const improved=original.replace('Testing','SQL | UAT');
const payload={provider:'copilot',model:'account-model',resume:original,jobDescription:'Test Analyst required to query SQL and support user acceptance testing for software releases.',job:{title:'Tester',keywords:['SQL','UAT'],responsibilities:['Test releases'],requirements:['Testing']},suggestions:[],atsFriendly:true};
test('one improvement pass preserves original evidence and account model',async()=>{
 const calls=[];const result=await tailorResume(payload,async(action,body)=>{calls.push(body);assert.equal(action,'rewrite');return {updatedResume:calls.length===1?original:improved,reviewNotes:[]};});
 assert.equal(result.updatedResume,improved);assert.equal(calls.length,2);assert.equal(calls[1].resume,original);assert.equal(calls[1].previousDraft,original);assert.equal(calls[1].model,payload.model);
});
test('lower-scoring refinement and failed refinement preserve the first complete draft',async()=>{
 for(const fail of [false,true]){let count=0;const result=await tailorResume(payload,async()=>{if(++count===1)return {updatedResume:original,reviewNotes:[]};if(fail)throw new Error('Unavailable');return {updatedResume:'Alex',reviewNotes:[]};});assert.equal(result.updatedResume,original);assert.equal(count,2);if(fail)assert.match(result.reviewNotes[0],/could not complete/);}
});
test('target reached, absent keywords and disabled option do not spend another inference',async()=>{
 for(const [body,draft] of [[payload,improved],[{...payload,atsFriendly:false},original],[{...payload,job:{...payload.job,keywords:[]}},original]]){let count=0;await tailorResume(body,async()=>{count++;return {updatedResume:draft};});assert.equal(count,1);}
});
test('shared LLM prompt gets computed feedback and treats draft as untrusted revision aid',()=>{
 const task=prepare('rewrite',{...payload,previousDraft:improved});assert.equal(task.input.resume,original);assert.equal(task.input.previousDraft,improved);assert.equal(task.input.atsOptimization.target,80);assert.equal(task.input.atsOptimization.currentEstimate,100);assert.match(task.instructions,/original resume remains the sole authority/);assert.match(task.instructions,/Never add unsupported keywords/);
 assert.throws(()=>prepare('rewrite',{...payload,previousDraft:42}),/Previous draft/);
 assert.equal(prepare('rewrite',{...payload,atsFriendly:false}).input.atsOptimization,undefined);
});

test('a lower ATS draft cannot replace the original or a saved tailored resume',async()=>{
 for(const body of [{...payload,resume:improved},{...payload,previousDraft:improved}]){
 let calls=0;
 await assert.rejects(tailorResume(body,async()=>{calls++;return {updatedResume:original,reviewNotes:[]};}),/current resume was kept/);
 assert.equal(calls,2);
 }
});
test('accepted requests survive refinement with the current draft and remain visible',async()=>{
 const selectedPriorities=[{title:'Clarify testing',detail:'Explain release testing.'}];
 const calls=[];
 const result=await tailorResume({...payload,selectedPriorities,previousDraft:original},async(_action,body)=>{calls.push(body);return {updatedResume:calls.length===1?original:improved,reviewNotes:[]};});
 assert.deepEqual(calls[1].selectedPriorities,selectedPriorities);
 assert.equal(calls[0].previousDraft,original);
 assert.match(result.reviewNotes.join(' '),/Accepted tailoring request: Clarify testing/);
});
