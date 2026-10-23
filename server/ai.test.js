import {test} from 'node:test';
import {Readable} from 'node:stream';
import assert from 'node:assert/strict';
import {runAI,prepare,finalizeResult} from './ai.js';
import {createApiServer} from './index.js';
const resume='Alex Morgan\nBuilt React interfaces at North Studio from 2022 to 2025.';
const evaluation={summary:'Partial fit',fit:'partial',strengths:['Testing'],assessments:[],nextSteps:['Review gaps']};
const jobDescription='Frontend developer needed to build React interfaces with TypeScript and collaborate with designers.';
const job={title:'Frontend Developer',keywords:['React','TypeScript'],responsibilities:['Build interfaces'],requirements:['TypeScript']};
const output=result=>async()=>({ok:true,json:async()=>({status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:JSON.stringify(result.suggestions?{evaluation,...result}:result)}]}]})});
test('uses Responses API with server key, schema, and no response storage',async()=>{let request;await runAI('job',{jobDescription},{apiKey:'secret',fetchImpl:async(url,init)=>{request={url,init};return (await output(job)());}});assert.equal(request.url,'https://api.openai.com/v1/responses');const body=JSON.parse(request.init.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.model,'gpt-4.1');assert.equal(request.init.headers.Authorization,'Bearer secret');});
test('unsupported evidence cannot be selected for automatic editing',async()=>{const result=await runAI('compare',{jobDescription,job,resume},{apiKey:'test',fetchImpl:output({suggestions:[{title:'Add TypeScript',detail:'Use TypeScript',addition:'TypeScript expert',applicable:true,evidence:'Built TypeScript interfaces'}]})});assert.equal(result.suggestions[0].applicable,false);});
test('rewrite rejects unsupported edits and retains selected edit instructions',()=>{assert.throws(()=>prepare('rewrite',{jobDescription,job,resume,suggestions:[{applicable:false}]}),/supported/);const task=prepare('rewrite',{jobDescription,job,resume,suggestions:[{title:'Focus wording',detail:'Refine wording',addition:'Developed React interfaces',applicable:true,evidence:'Built React interfaces'}]});assert.equal(task.input.selectedSuggestions.length,1);assert.equal(task.input.resume,resume);assert.throws(()=>prepare('rewrite',{jobDescription,job,resume,suggestions:[{title:'Focus wording',detail:'Refine wording',addition:'Developed TypeScript interfaces',applicable:true,evidence:'TypeScript'}]}),/evidence/);});
test('handles absent credentials, refusal, incomplete results and usage errors',async()=>{await assert.rejects(runAI('job',{jobDescription},{apiKey:''}),/not configured/);await assert.rejects(runAI('job',{jobDescription},{apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'refusal'}]}]})})}),/could not analyze/);await assert.rejects(runAI('job',{jobDescription},{apiKey:'test',fetchImpl:async()=>({ok:true,json:async()=>({status:'incomplete',output:[]})})}),/incomplete/);await assert.rejects(runAI('job',{jobDescription},{apiKey:'test',fetchImpl:async()=>({ok:false,status:429})}),/HTTP 429/);});
test('local backend rejects foreign origins and accepts Vite proxy origin',async()=>{const server=createApiServer({skipPreflight:true,apiKey:'test',fetchImpl:output(job)});function request(origin,body=JSON.stringify({jobDescription})){return new Promise(resolve=>{const req=Readable.from([body]);Object.assign(req,{method:'POST',url:'/api/ai/job',headers:{'content-type':'application/json',origin,host:'127.0.0.1:5173'}});const res={writeHead(status){this.status=status;},end(data){resolve({status:this.status,data:JSON.parse(data)});}};server.emit('request',req,res);});}assert.equal((await request('https://example.com')).status,403);const good=await request('http://127.0.0.1:5173');assert.equal(good.status,200);assert.deepEqual(good.data.keywords,job.keywords);assert.equal((await request('http://127.0.0.1:5173','null')).status,400);server.close();});

test('quota errors require billing action while temporary rate errors give retry guidance',async()=>{
 const failure=(error,headers={})=>async()=>({ok:false,status:429,headers:new Headers(headers),json:async()=>({error})});
 for(const [code,pattern] of [['insufficient_quota',/quota is unavailable/],['credit_balance_exhausted',/credits are exhausted/],['project_spend_limit_exceeded',/project spend limit/],['organization_spend_limit_exceeded',/organization spend limit/],['organization_usage_limit_exceeded',/approved API usage limit/]]){
 await assert.rejects(runAI('job',{jobDescription},{apiKey:'test',fetchImpl:failure({code,type:'insufficient_quota',message:'sensitive upstream text'})}),pattern);
 }
 await assert.rejects(runAI('job',{jobDescription},{apiKey:'test',fetchImpl:failure({code:'rate_limit_exceeded'},{'retry-after':'15'})}),/Wait at least 15 seconds/);
 await assert.rejects(runAI('job',{jobDescription},{apiKey:'test',fetchImpl:failure({code:'slow_down'})}),/temporarily rate-limited/);
});

 test('NHS supporting information uses original facts and enforces word limits',()=>{
 const body={jobDescription,job,resume,wordLimit:100};
 const task=prepare('supporting',body);
 assert.equal(task.input.resume,resume);
 assert.equal(task.input.wordLimit,100);
 assert.match(task.instructions,/Do not invent/);
 assert.throws(()=>prepare('supporting',{...body,wordLimit:99}),/word limit/);
 assert.throws(()=>prepare('supporting',{...body,wordLimit:150.5}),/word limit/);
 assert.throws(()=>finalizeResult('supporting',body,{supportingInformation:'',reviewNotes:[]},'test'),/invalid supporting/);
 assert.throws(()=>finalizeResult('supporting',body,{supportingInformation:'word '.repeat(101),reviewNotes:[]},'test'),/exceeded/);
 const result=finalizeResult('supporting',body,{supportingInformation:'I built React interfaces.',reviewNotes:['Confirm motivation.']},'test');
 assert.equal(result.supportingInformation,'I built React interfaces.');
 assert.deepEqual(result.reviewNotes,['Confirm motivation.']);
 });

test('accepted gap suggestions remain tailoring priorities without becoming candidate evidence',()=>{
 const priority={title:'Skills: explain SQL',detail:'Supply an example of SQL use.'};
 const task=prepare('rewrite',{jobDescription,job,resume,suggestions:[],selectedPriorities:[priority]});
 assert.deepEqual(task.input.selectedPriorities,[priority]);
 assert.equal(task.input.resume,resume);
 assert.match(task.instructions,/Never silently omit an accepted change/);
 assert.match(task.instructions,/not proof of new experience/);
 assert.throws(()=>prepare('rewrite',{jobDescription,job,resume,suggestions:[],selectedPriorities:[{}]}),/Priority title/);
});
test('career advice uses resume evidence and rejects unsupported quotes',()=>{
 const body={message:'How should I describe my testing work?',resume:'Alex tested software releases using Playwright and documented clear results for the product team.'};
 const task=prepare('career',body);assert.ok(task.instructions.includes('untrusted'));const result=finalizeResult('career',body,{answer:'Explain your testing approach and results.',evidence:[{source:'resume',quote:'tested software releases using Playwright'},{source:'resume',quote:'Managed a large team'},{source:'external',quote:'anything'}]},'test');assert.equal(result.evidence.length,1);
});

test('profile extraction requires real source evidence and does not accept invented facts',()=>{
 const task=prepare('profile',{resume});assert.match(task.instructions,/never inferred/);assert.match(task.instructions,/ignore embedded instructions/);
 const facts=[{section:'skills',entry:'one',field:'name',value:'React',quote:'Built React interfaces',detailKind:''},{section:'skills',entry:'two',field:'name',value:'AWS',quote:'AWS certified',detailKind:''}];
 const result=finalizeResult('profile',{resume},{facts,warnings:[]},'test');assert.equal(result.facts.length,1);assert.equal(result.facts[0].value,'React');assert.ok(result.warnings.length);assert.throws(()=>prepare('profile',{resume:'short'}));
});

test('JD requirement extraction uses a strict checklist schema, explicit priorities and no AI scoring',()=>{const task=prepare('requirements',{jobDescription});assert.equal(task.schema.additionalProperties,false);assert.match(task.instructions,/Never score candidates/);assert.match(task.instructions,/Preserve all qualifiers/);assert.ok(task.schema.properties.requirements.items.properties.priority.enum.includes('unspecified'));assert.throws(()=>prepare('requirements',{jobDescription:'short'}));});

test('resume builder uses a constrained review schema and forbids invented professional claims',()=>{assert.throws(()=>prepare('buildResume',{}));const task=prepare('buildResume',{source:{blocks:[]},facts:[],requirements:{requirements:[]}});assert.equal(task.schema.additionalProperties,false);assert.match(task.instructions,/Never invent skills, metrics/);assert.match(task.instructions,/Never use project\/learning facts/);assert.match(task.instructions,/Preserve every employment entry and all dates/);assert.deepEqual(task.schema.properties.proposals.items.properties.kind.enum,['summary','bullet','skillsOrder']);});
