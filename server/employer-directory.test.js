import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {UK_EMPLOYERS,EXTERNAL_EMPLOYERS,parseCareerBoard} from './uk-employers.js';
import {createEmployerDirectory} from './employer-directory.js';
import {createJobService} from './job-service.js';
test('built-in directory distinguishes 21 candidate feeds from 19 external career links',()=>{
 assert.equal(UK_EMPLOYERS.length,21);assert.equal(EXTERNAL_EMPLOYERS.length,19);assert.ok(UK_EMPLOYERS.some(item=>item.provider==='smartrecruiters'));assert.ok(EXTERNAL_EMPLOYERS.every(item=>item.provider==='external'));
});
test('career URL parsing accepts supported public boards and rejects arbitrary/private targets',()=>{
 assert.equal(parseCareerBoard('https://jobs.eu.lever.co/example/abc','Employer').region,'eu');assert.equal(parseCareerBoard('https://jobs.smartrecruiters.com/Version1/123-job','Version 1').board,'Version1');
 for(const url of ['http://jobs.lever.co/example','https://localhost/board','https://127.0.0.1/board','https://jobs.lever.co.evil.example/test','https://user:password@jobs.lever.co/example','https://jobs.lever.co:8080/example'])assert.throws(()=>parseCareerBoard(url,'Employer'));
});
test('employer connections persist, deduplicate by board and survive restarts',async()=>{
 const root=await mkdtemp(join(tmpdir(),'align-employers-')),path=join(root,'employers.json');try{
 const directory=createEmployerDirectory({path});await directory.add({company:'Example',careersUrl:'https://jobs.lever.co/example'});await directory.add({company:'Example renamed',careersUrl:'https://jobs.lever.co/example'});const entries=await createEmployerDirectory({path}).read();assert.equal(entries.length,1);assert.equal(entries[0].company,'Example renamed');
 await writeFile(path,'broken');await assert.rejects(createEmployerDirectory({path}).add({company:'Other',careersUrl:'https://jobs.lever.co/other'}));assert.equal(await readFile(path,'utf8'),'broken');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('connecting an employer updates runtime collection without a restart',async()=>{
 let calls=0;const service=createJobService({env:{JOB_EMPLOYER_BOARDS:'[]'},storePath:null,fetcher:async()=>{calls++;return new Response(JSON.stringify({jobs:[{id:1,title:'Test Automation Engineer',location:{name:'London'},absolute_url:'https://example.com/job',content:'Test automation'}]}));}});
 await service.addEmployer({company:'New employer',careersUrl:'https://job-boards.greenhouse.io/newemployer'});await service.refresh();assert.equal(calls,1);const result=await service.browse(new URLSearchParams({company:'New employer'}));assert.equal(result.total,1);const directory=await service.employers();assert.equal(directory.exhaustive,false);assert.equal(directory.employers.find(item=>item.company==='New employer').connected,true);assert.equal(directory.employers.find(item=>item.company==='Microsoft').connected,false);
});
test('collection uses no more than three simultaneous employer requests',async()=>{
 let concurrent=0,peak=0;const service=createJobService({env:{JOB_EMPLOYER_BOARDS:JSON.stringify(Array.from({length:7},(_,index)=>({provider:'greenhouse',board:'example'+index,company:'Company '+index})))},storePath:null,fetcher:async()=>{concurrent++;peak=Math.max(peak,concurrent);await new Promise(resolve=>setTimeout(resolve,10));concurrent--;return new Response('{"jobs":[]}');}});
 const status=await service.refresh();assert.equal(peak,3);assert.equal(status.progress.completed,7);assert.equal(status.progress.total,7);
});
test('budget-limited refreshes rotate to employers skipped by the previous run',async()=>{
 const seen=[];let now=new Date('2026-10-22T12:00:00Z');const service=createJobService({env:{JOB_EMPLOYER_BOARDS:JSON.stringify(Array.from({length:5},(_,index)=>({provider:'greenhouse',board:'board'+index,company:'Company '+index})))},storePath:null,refreshBudgetMs:15,now:()=>now,fetcher:async url=>{seen.push(url.pathname);await new Promise(resolve=>setTimeout(resolve,25));return new Response('{"jobs":[]}');}});
 await service.refresh();assert.equal(seen.length,3);now=new Date('2026-10-22T12:02:00Z');await service.refresh();assert.match(seen[3],/board3/);assert.match(seen[4],/board4/);
});
test('connecting during a running refresh schedules a follow-up collection for the new employer',async()=>{
 let release,entered,calls=0;const started=new Promise(resolve=>entered=resolve);
 const service=createJobService({env:{JOB_EMPLOYER_BOARDS:'[]'},storePath:null,fetcher:async url=>{calls++;if(calls===1){entered();await new Promise(resolve=>release=resolve);}const board=url.pathname.includes('/new/')?'new':'old';return new Response(JSON.stringify({jobs:[{id:1,title:'Engineer',location:{name:'London'},absolute_url:'https://example.com/'+board,content:'Description'}]}));}});
 await service.addEmployer({company:'Old',careersUrl:'https://job-boards.greenhouse.io/old'});const running=service.refresh();await started;await service.addEmployer({company:'New',careersUrl:'https://job-boards.greenhouse.io/new'});const joined=service.refresh();release();await Promise.all([running,joined]);assert.equal((await service.browse(new URLSearchParams({company:'New'}))).total,1);
});
