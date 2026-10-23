import {test} from 'node:test';import assert from 'node:assert/strict';import {access} from 'node:fs/promises';import {runCopilot,parseCopilotOutput} from './copilot.js';
const jobDescription='Test Analyst required to create test scripts, query SQL, execute UAT and report defects.';
const job={title:'Test Analyst',keywords:['SQL','UAT'],responsibilities:['Test scripts'],requirements:['SQL']};
const evaluation={summary:'Partial fit',fit:'partial',strengths:['SQL'],assessments:[{requirement:'SQL',status:'met',evidence:'Used SQL for UAT',solution:'Describe your queries.'},{requirement:'Cerner',status:'met',evidence:'Cerner expert',solution:'Add only verified Cerner experience.'}],nextSteps:['Clarify healthcare experience.']};
test('Copilot processes a JD with tools denied, and cleans temporary files',async()=>{let directory;const result=await runCopilot('job',{jobDescription},{execute:async(binary,args,options,prompt)=>{directory=options.cwd;assert.ok(args.includes('--deny-tool'));assert.deepEqual(args.slice(args.indexOf('--deny-tool')+1,args.indexOf('--deny-tool')+4),['shell','write','url']);assert.equal(args[args.indexOf('--available-tools')+1],'__resume_text_only__');assert.ok(!args.includes('*'));assert.ok(args.includes('--disable-builtin-mcps'));assert.equal(options.shell,false);assert.ok(prompt.includes(jobDescription));return JSON.stringify(job);}});assert.equal(result.provider,'copilot');await assert.rejects(access(directory));});
test('Copilot evaluation rejects claims without evidence in the resume',async()=>{const result=await runCopilot('compare',{jobDescription,job,resume:'Alex Example\nUsed SQL for UAT and created software testing scripts.'},{execute:async()=>JSON.stringify({evaluation,suggestions:[]})});assert.equal(result.evaluation.assessments[0].status,'met');assert.equal(result.evaluation.assessments[1].status,'missing');assert.equal(result.evaluation.assessments[1].evidence,'');});
test('Copilot supports rewrite output and reports invalid structured results',async()=>{const resume='Alex Example\nUsed SQL for UAT and created software testing scripts.';const result=await runCopilot('rewrite',{jobDescription,job,resume,suggestions:[]},{execute:async()=>JSON.stringify({resume:{name:'Alex Example',contact:[],summary:'Software testing experience with SQL and UAT.',skills:['SQL'],experience:[],education:[],additionalSections:[]},reviewNotes:[]})});assert.match(result.updatedResume,/PROFESSIONAL SUMMARY/);assert.deepEqual(parseCopilotOutput('```json\n{"title":"Test"}\n```'),{title:'Test'});assert.throws(()=>parseCopilotOutput('unstructured output'),/invalid structured/);});
test('uses JSONL output and retries one malformed response while retaining tool denials',async()=>{
 let attempts=0,directory;
 const result=await runCopilot('job',{jobDescription},{execute:async(_binary,args,options,prompt)=>{
 attempts++;directory=options.cwd;assert.equal(args[args.indexOf('--output-format')+1],'json');assert.deepEqual(args.slice(args.indexOf('--deny-tool')+1,args.indexOf('--deny-tool')+4),['shell','write','url']);assert.equal(args[args.indexOf('--available-tools')+1],'__resume_text_only__');assert.ok(!args.includes('*'));assert.ok(options.timeout<=120000);
 if(attempts===1)return JSON.stringify({type:'assistant.message',data:{content:'Not valid JSON'}})+'\n'+JSON.stringify({type:'result',exitCode:0});
 assert.match(prompt,/FORMAT RETRY/);return JSON.stringify({type:'assistant.message',data:{content:JSON.stringify(job)}})+'\n'+JSON.stringify({type:'result',exitCode:0});
 }});
 assert.equal(attempts,2);assert.equal(result.title,job.title);await assert.rejects(access(directory));
});
test('invalid schema output is retried once, then fails without exposing supplied text',async()=>{
 let attempts=0,directory;
 await assert.rejects(runCopilot('job',{jobDescription},{execute:async(_binary,_args,options)=>{attempts++;directory=options.cwd;return JSON.stringify({title:'private resume content',keywords:'Wrong type'});}}),error=>{assert.match(error.message,/after two attempts/);assert.ok(!error.message.includes('private resume content'));return true;});
 assert.equal(attempts,2);await assert.rejects(access(directory));
});
test('execution and terminal-session failures do not trigger inference retries',async()=>{
 for(const failure of ['execution','terminal']){
 let attempts=0;
 await assert.rejects(runCopilot('job',{jobDescription},{execute:async()=>{attempts++;if(failure==='execution')throw new Error('hidden diagnostic');return JSON.stringify({type:'result',exitCode:1});}}),/Copilot/);
 assert.equal(attempts,1);
 }
});
test('CLI option rejection gets a useful error without exposing diagnostics or retrying inference',async()=>{
 let attempts=0;
 await assert.rejects(runCopilot('job',{jobDescription},{execute:async()=>{attempts++;throw Object.assign(new Error('private document contents'),{stderr:'Invalid --deny-tool value. Error: Invalid rule format'});}}),error=>{assert.match(error.message,/CLI rejected the request options/);assert.ok(!error.message.includes('private document'));return true;});
 assert.equal(attempts,1);
});
