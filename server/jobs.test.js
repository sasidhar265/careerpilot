import test from 'node:test';
import assert from 'node:assert/strict';
import {safeJobUrl} from './jobs.js';
import {createApiServer} from './index.js';
const env={JOB_EMPLOYER_BOARDS:'[{"provider":"greenhouse","board":"example","company":"Example"}]'};
const fetcher=async()=>new Response(JSON.stringify({jobs:[{id:1,title:'Test Automation Engineer',location:{name:'London, UK'},absolute_url:'https://example.com/job',content:'<p>Automated testing</p>'}]}));
function request(server,method,url,body,headers={}){return new Promise(resolve=>server.emit('request',{method,url,headers,async *[Symbol.asyncIterator](){if(body)yield JSON.stringify(body);}},{writeHead(status){this.status=status;},end(body){resolve({status:this.status,data:JSON.parse(body)});}}));}
test('safe source links reject executable URLs',()=>{assert.equal(safeJobUrl('javascript:alert(1)'),'');assert.equal(safeJobUrl('https://example.com/job'),'https://example.com/job');});
test('job API searches public employer catalogue through both supported search routes',async()=>{
 const server=createApiServer({jobs:{storePath:null,env,fetcher}});assert.equal((await request(server,'POST','/api/jobs/refresh')).status,200);
 for(const path of ['/api/jobs','/api/jobs/catalogue']){const result=await request(server,'GET',path+'?what=Test%20Automation');assert.equal(result.status,200);assert.equal(result.data.total,1);assert.equal(result.data.jobs[0].source,'Greenhouse');}
 const lookup=await request(server,'POST','/api/jobs/lookup',{aliases:['Greenhouse:example:1']});assert.equal(lookup.data.jobs.length,1);
 assert.equal((await request(server,'POST','/api/jobs/lookup',{aliases:'bad'})).status,400);
 assert.equal((await request(server,'POST','/api/jobs/refresh',null,{origin:'https://foreign.example',host:'localhost:3001'})).status,403);
});
test('employer directory API lists careers links and validates new connections',async()=>{
 const server=createApiServer({jobs:{storePath:null,env:{JOB_EMPLOYER_BOARDS:'[]'},fetcher}});
 const before=await request(server,'GET','/api/jobs/employers');assert.equal(before.data.exhaustive,false);assert.equal(before.data.employers.length,40);
 assert.equal((await request(server,'POST','/api/jobs/employers',{company:'Example',careersUrl:'https://localhost/secret'})).status,400);
 const added=await request(server,'POST','/api/jobs/employers',{company:'Example',careersUrl:'https://job-boards.greenhouse.io/example'});assert.equal(added.status,201);
 const status=await request(server,'GET','/api/jobs/sources');assert.equal(status.data.sources.length,1);
});
