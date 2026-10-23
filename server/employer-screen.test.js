import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepare,finalizeResult} from './ai.js';
import {employerCriteria,currentScreen} from '../src/employer-screen.js';
const resume='Alex Example\nWorked as a tester for three years. Used SQL to validate releases.';
const job={title:'Tester',requirements:['Minimum three years of testing'],responsibilities:['Validate releases'],keywords:['SQL']};
const body={jobDescription:'Tester required to validate releases using SQL. Minimum three years of testing experience.',job,resume};
function response(){return {summary:'Review supplied evidence.',assessments:employerCriteria(job).map((c,i)=>({id:c.id,status:i===1?'partial':'met',evidence:i===0?'Worked as a tester for three years.':'Used SQL to validate releases.',sourceEvidence:i===0?'Worked as a tester for three years.':'Used SQL to validate releases.',reason:'Evidence supports the criterion.',action:'Review the wording.'}))};}
test('fixed weighted employer review uses all JD criteria and exact evidence',()=>{
 const task=prepare('screen',body);assert.match(task.instructions,/not mere keyword presence/);assert.match(task.instructions,/Unknown work authorization/);
 const result=finalizeResult('screen',body,response(),'test');assert.equal(result.score,83);assert.equal(result.rows.length,3);assert.equal(result.explicitGaps.length,0);
 assert.equal(result.rows[0].explicitRequirement,true);
});
test('invalid resume quotes cannot contribute positive screening credit',()=>{
 const data=response();data.assessments[0].evidence='I have ten years experience';
 const result=finalizeResult('screen',body,data,'test');assert.equal(result.score,33);assert.equal(result.rows[0].status,'missing');assert.equal(result.rows[0].evidence,'');assert.equal(result.explicitGaps.length,1);
});
test('tailoring cannot create qualification evidence absent from original facts',()=>{
 const data=response();data.assessments[0].evidence='Ten years of testing';data.assessments[0].sourceEvidence='Ten years of testing';
 const result=finalizeResult('screen',{...body,resume:resume+' Ten years of testing',sourceResume:resume},data,'test');assert.equal(result.rows[0].status,'missing');
});
test('missing, duplicate, unknown and malformed criteria are rejected',()=>{
 const incomplete=response();incomplete.assessments.pop();assert.throws(()=>finalizeResult('screen',body,incomplete,'test'),/incomplete employer review/);
 const duplicate=response();duplicate.assessments[1].id=duplicate.assessments[0].id;assert.throws(()=>finalizeResult('screen',body,duplicate,'test'),/invalid employer review/);
 const unknown=response();unknown.assessments[0].id='invented';assert.throws(()=>finalizeResult('screen',body,unknown,'test'),/invalid employer review/);
 const malformed=response();malformed.assessments[0].status='approved';assert.throws(()=>finalizeResult('screen',body,malformed,'test'),/invalid employer review/);
});
test('assessment becomes stale when resume or JD changes and repeated criteria receive no extra weight',()=>{
 const record={resume,jobDescription:body.jobDescription,result:{score:83}};
 assert.equal(currentScreen(record,resume,body.jobDescription).score,83);
 assert.equal(currentScreen(record,resume+' edit',body.jobDescription),null);
 assert.equal(currentScreen(record,resume,body.jobDescription+' edit'),null);
 assert.equal(employerCriteria({...job,keywords:['SQL','sql','Validate releases']}).length,3);
});
test('screen endpoint returns the validated weighted review through the provider route',async()=>{
 const {Readable}=await import('node:stream');
 const {createApiServer}=await import('./index.js');
 let task;
 const server=createApiServer({skipPreflight:true,apiKey:'test',fetchImpl:async(_url,init)=>{task=JSON.parse(init.body);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(response())}]}]})};}});
 try{
 const result=await new Promise(resolve=>{
 const req=Readable.from([JSON.stringify(body)]);Object.assign(req,{method:'POST',url:'/api/ai/screen',headers:{'content-type':'application/json',origin:'http://127.0.0.1:5173',host:'127.0.0.1:5173'}});
 const res={writeHead(status){this.status=status;},end(data){resolve({status:this.status,data:JSON.parse(data)});}};server.emit('request',req,res);
 });
 assert.equal(result.status,200);assert.equal(result.data.score,83);assert.equal(task.text.format.name,'screen');assert.equal(task.store,false);
 assert.equal(JSON.parse(task.input).sourceResume,resume);
 }finally{server.close();}
});
