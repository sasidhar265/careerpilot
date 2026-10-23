import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {canonicalUrl,availability,createCatalogue,filterCatalogue} from './job-catalogue.js';
const when='2026-10-22T12:00:00Z';
const job={id:'one',source:'Adzuna',title:'NHS nurse',company:'Trust',location:'Leeds',url:'https://www.jobs.nhs.uk/candidate/jobadvert/one?utm_source=test',description:'Nursing care',created:when,excerpt:true,salaryMin:30000,salaryMax:40000};
test('canonical URLs drop tracking but preserve meaningful vacancy parameters',()=>{
 assert.equal(canonicalUrl(job.url),'https://www.jobs.nhs.uk/candidate/jobadvert/one');
 assert.notEqual(canonicalUrl('https://example.com/job?id=1'),canonicalUrl('https://example.com/job?id=2'));
 assert.equal(canonicalUrl('javascript:alert(1)'),'');
});
test('deduplicates source references and exact URLs while preserving provenance and first seen',async()=>{
 const store=createCatalogue();await store.ingest([job],when);await store.ingest([{...job,id:'nhs-ref',source:'NHS Jobs',url:canonicalUrl(job.url),description:'Full person specification',excerpt:false}], '2026-10-23T12:00:00Z');
 await store.ingest([{...job,description:'Excerpt'}],'2026-10-24T12:00:00Z');const state=await store.read();
 assert.equal(state.jobs.length,1);assert.equal(state.jobs[0].firstSeenAt,when);assert.equal(state.jobs[0].lastSeenAt,'2026-10-24T12:00:00Z');assert.equal(state.jobs[0].description,'Full person specification');assert.deepEqual(state.jobs[0].aliases,['Adzuna:one','NHS Jobs:nhs-ref']);
 // Identical titles at separate URLs are deliberately separate vacancies.
 await store.ingest([{...job,id:'two',url:'https://example.com/two'}],when);assert.equal((await store.read()).jobs.length,2);
});
test('absence does not expire jobs; only a supplied closing date expires a listing',async()=>{
 const store=createCatalogue();await store.ingest([job],when);await store.ingest([],'2026-11-02T12:00:00Z');const saved=(await store.read()).jobs[0];
 assert.equal(availability(saved,new Date('2026-11-02T12:00:00Z')),'stale');assert.equal(availability({...saved,closingDate:'2026-10-22'},new Date(when)),'recent');assert.equal(availability({...saved,closingDate:'2026-10-21'},new Date(when)),'expired');
});
test('atomic catalogue persists across restarts and serialized writes do not lose jobs',async()=>{
 const root=await mkdtemp(join(tmpdir(),'align-jobs-'));const path=join(root,'jobs.json');try{
 const store=createCatalogue({path});await Promise.all([store.ingest([job],when),store.ingest([{...job,id:'two',url:'https://example.com/two'}],when),store.recordRun('source',{count:2})]);
 const state=await createCatalogue({path}).read();assert.equal(state.jobs.length,2);assert.equal(state.runs.source.count,2);assert.equal(JSON.parse(await readFile(path,'utf8')).version,1);
 await writeFile(path,'broken');const corrupted=createCatalogue({path});await assert.rejects(corrupted.ingest([job],when),/could not be read/);assert.equal(await readFile(path,'utf8'),'broken');
 }finally{await rm(root,{recursive:true,force:true});}
});
test('catalogue filters salary, location, NHS, dates and excludes expired by default',async()=>{
 const store=createCatalogue();await store.ingest([job,{...job,id:'expired',url:'https://example.com/expired',closingDate:'2026-10-01'},{...job,id:'other',title:'Developer',company:'Agency',description:'Software',url:'https://example.com/other',location:'London'}],when);
 const state=await store.read(),params=new URLSearchParams({nhs:'1',where:'Leeds',salary_min:'35000',days:'7'});assert.equal(filterCatalogue(state,params,new Date(when)).total,1);params.set('includeExpired','1');assert.equal(filterCatalogue(state,params,new Date(when)).total,2);
});
test('clearing the disk cache invalidates loaded memory and does not resurrect old listings',async()=>{
 const root=await mkdtemp(join(tmpdir(),'align-clear-cache-')),path=join(root,'jobs.json');try{
 const store=createCatalogue({path});await store.ingest([job],when);assert.equal((await store.read()).jobs.length,1);await rm(path);assert.equal((await store.read()).jobs.length,0);
 await store.recordRun('new-source',{count:0});assert.equal(JSON.parse(await readFile(path,'utf8')).jobs.length,0);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('a refreshed catalogue written by another store replaces stale in-memory results',async()=>{
 const root=await mkdtemp(join(tmpdir(),'align-reload-cache-')),path=join(root,'jobs.json');try{
 const reader=createCatalogue({path}),writer=createCatalogue({path});await writer.ingest([job],when);assert.equal((await reader.read()).jobs.length,1);
 await writer.ingest([{...job,id:'new',title:'New opening',url:'https://example.com/new'}],when);assert.equal((await reader.read()).jobs.length,2);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('a refreshed excerpt updates listing metadata while keeping an earlier full description',async()=>{
 const store=createCatalogue();await store.ingest([{...job,excerpt:false,description:'Full requirements'}],when);await store.ingest([{...job,title:'Updated vacancy title',excerpt:true,description:'Short excerpt'}],when);
 const saved=(await store.read()).jobs[0];assert.equal(saved.title,'Updated vacancy title');assert.equal(saved.description,'Full requirements');
});
test('source failure metadata changes revisions without claiming listings were updated',async()=>{
 const store=createCatalogue();await store.ingest([job],when);const before=await store.read();await store.recordRun('source',{error:'Unavailable'});const after=await store.read();assert.notEqual(before.revision,after.revision);assert.equal(before.updatedAt,after.updatedAt);
});
