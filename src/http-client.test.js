import test from 'node:test';
import assert from 'node:assert/strict';
import {applicationApiPath} from './http-client.js';
test('built-in guest API requests stay on the current origin and use only the guest namespace',()=>{assert.equal(applicationApiPath('/api/jobs?q=Test','/guest-assets/'),'/api/guest/jobs?q=Test');assert.equal(applicationApiPath('/api/ai/compare','/guest-assets/'),'/api/guest/ai/compare');assert.equal(applicationApiPath('/api/jobs','/'),'/api/jobs');assert.equal(applicationApiPath('https://example.test/source','/guest-assets/'),'https://example.test/source');});

import {redirectSignedInResponse} from './http-client.js';
test('an already-open anonymous workspace leaves when the server confirms a signed-in session',async()=>{const destinations=[],response=Response.json({redirectTo:'/local-account'},{status:403});assert.equal(await redirectSignedInResponse(response,path=>destinations.push(path)),response);assert.deepEqual(destinations,['/local-account']);assert.deepEqual(await response.json(),{redirectTo:'/local-account'});});
test('redirect handling rejects external destinations and ordinary provider failures',async()=>{const destinations=[];for(const response of [Response.json({redirectTo:'https://untrusted.example'},{status:403}),Response.json({error:'Unavailable'},{status:503}),new Response('error page',{status:403})])await redirectSignedInResponse(response,path=>destinations.push(path));assert.deepEqual(destinations,[]);});
