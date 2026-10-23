import {test} from 'node:test';
import assert from 'node:assert/strict';
import {schemas} from './ai.js';
import {parseCopilotOutput} from './copilot-output.js';
const job={title:'Tester',keywords:['SQL'],responsibilities:['Test releases'],requirements:['Testing']};
const event=content=>({type:'assistant.message',data:{content}});
const stream=records=>records.map(record=>JSON.stringify(record)).join('\n');
test('reads final assistant JSON from CLI events without parsing echoed input, reasoning or deltas',()=>{
 const output=stream([{type:'user.message',data:{content:JSON.stringify({...job,title:'Wrong echoed source'})}},{type:'assistant.reasoning',data:{content:'Reasoning'}},{type:'assistant.message_delta',data:{deltaContent:JSON.stringify(job)}},event('I will analyze the document.'),event('```json\n'+JSON.stringify(job)+'\n```'),{type:'result',exitCode:0,usage:{premiumRequests:1}}]);
 assert.deepEqual(parseCopilotOutput(output,schemas.job),job);
});
test('supports legacy JSON, fenced JSON and prose around one valid structured object',()=>{
 for(const output of [JSON.stringify(job),'```json\n'+JSON.stringify(job)+'\n```','Result:\n'+JSON.stringify(job,null,2)+'\nDone.','\u001b[32m'+JSON.stringify(job)+'\u001b[0m'])assert.deepEqual(parseCopilotOutput(output,schemas.job),job);
});
test('handles braces and escaped quotes in JSON strings without changing factual text',()=>{
 const quoted={...job,title:'Engineer {platform} "testing" \\ tools'};
 assert.deepEqual(parseCopilotOutput('Here is the result:\n'+JSON.stringify(quoted),schemas.job),quoted);
});
test('rejects truncated, ambiguous and schema-invalid responses',()=>{
 for(const output of [JSON.stringify(job).slice(0,-1),JSON.stringify(job)+'\n'+JSON.stringify({...job,title:'Different'}),JSON.stringify({...job,keywords:'SQL'}),JSON.stringify({...job,extra:true}),'No JSON provided'])assert.throws(()=>parseCopilotOutput(output,schemas.job),error=>error.copilotOutputInvalid===true);
});
test('does not mistake event-only output or source input for a model answer',()=>{
 for(const records of [[{type:'user.message',data:{content:JSON.stringify(job)}},{type:'result',exitCode:0}],[{type:'assistant.message_delta',data:{deltaContent:JSON.stringify(job)}},{type:'result',exitCode:0}]])assert.throws(()=>parseCopilotOutput(stream(records),schemas.job),/final assistant message/);
});
test('failed CLI sessions cannot return an earlier apparently valid result',()=>{
 for(const last of [{type:'session.error',data:{message:'secret contents'}},{type:'result',exitCode:1}])assert.throws(()=>parseCopilotOutput(stream([event(JSON.stringify(job)),last]),schemas.job),error=>{assert.equal(error.copilotOutputInvalid,undefined);assert.ok(!error.message.includes('secret contents'));return true;});
});
