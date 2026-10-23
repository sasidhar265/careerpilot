import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestAI} from './ai-client.js';
const call=response=>requestAI('job',{jobDescription:'sample'},{fetchImpl:async()=>response});
test('HTML and empty proxy errors explain how to start the backend',async()=>{await assert.rejects(call(new Response('<html>App</html>',{headers:{'Content-Type':'text/html'}})),/backend is unavailable/);await assert.rejects(call(new Response('',{status:500})),/npm run dev/);});
test('server configuration and upstream errors are preserved',async()=>{await assert.rejects(call(Response.json({error:'Set OPENAI_API_KEY in .env'},{status:503})),/OPENAI_API_KEY/);await assert.rejects(call(Response.json({error:'OpenAI usage limit reached'},{status:429})),/usage limit/);});
test('valid JSON is returned and malformed responses are handled',async()=>{assert.deepEqual(await call(Response.json({keywords:['React']})),{keywords:['React']});await assert.rejects(call(new Response('{bad',{headers:{'Content-Type':'application/json'}})),/invalid JSON/);await assert.rejects(call(Response.json(null)),/invalid result/);});
test('network failure gives backend instructions without leaking internal errors',async()=>{await assert.rejects(requestAI('job',{}, {fetchImpl:async()=>{throw new Error('private server info');}}),/backend is unavailable/);});
