import test from 'node:test';
import assert from 'node:assert/strict';
import {createJobService} from './job-service.js';
const when=new Date('2026-10-22T12:00:00Z'),env={JOB_EMPLOYER_BOARDS:'[{"provider":"greenhouse","board":"example","company":"Example"}]'};
const result={jobs:[{id:'1',title:'Nurse',location:{name:'London, UK'},absolute_url:'https://example.com/job',content:'Details'}]};
const response=()=>new Response(JSON.stringify(result));
test('collection persists jobs, reports source health, caps repeated refresh calls and protects saved context',async()=>{
 let calls=0;const service=createJobService({env,storePath:null,now:()=>when,fetcher:async()=>{calls++;return response();}});
 const status=await service.refresh();assert.equal(status.counts.total,1);assert.equal(status.sources[0].count,1);assert.ok(!JSON.stringify(status).includes('secret-key'));
 await service.refresh();assert.equal(calls,1);const lookup=await service.lookup(['Greenhouse:example:1']);assert.equal(lookup.length,1);assert.equal(lookup[0].availability,'recent');assert.equal((await service.browse(new URLSearchParams())).total,1);
});
test('failed source refresh retains old jobs and last successful observation',async()=>{
 let time=when,fail=false;const service=createJobService({env,storePath:null,now:()=>time,fetcher:async()=>{if(fail)throw Error('secret-key');return response();}});
 await service.refresh();fail=true;time=new Date('2026-11-01T12:00:00Z');const status=await service.refresh();assert.equal(status.counts.total,1);assert.equal(status.counts.stale,1);assert.equal(status.counts.expired,0);assert.equal(status.sources[0].lastSuccessAt,when.toISOString());assert.match(status.sources[0].error,/retained/);assert.ok(!JSON.stringify(status).includes('secret-key'));
});
test('concurrent refreshes share one upstream request',async()=>{
 let release,calls=0,entered;const started=new Promise(resolve=>entered=resolve);const service=createJobService({env,storePath:null,now:()=>when,fetcher:async()=>{calls++;entered();await new Promise(resolve=>release=resolve);return response();}});
 const first=service.refresh(),second=service.refresh();await started;release();await Promise.all([first,second]);assert.equal(calls,1);
});
test('invalid board configuration is reported without network access',async()=>{
 const service=createJobService({env:{JOB_EMPLOYER_BOARDS:'bad-json'},storePath:null,fetcher:()=>assert.fail('unexpected request')});const status=await service.refresh();assert.equal(status.sources.length,0);assert.match(status.configurationError,/JSON array/);
});
test('NHS feed jobs ingest without API credentials',async()=>{
 const service=createJobService({env:{JOB_EMPLOYER_BOARDS:'[]',NHS_JOBS_FEED_URL:'https://www.jobs.nhs.uk/feed'},storePath:null,now:()=>when,fetcher:async()=>new Response('<rss><channel><item><guid>nhs1</guid><title>NHS Administrator</title><link>https://www.jobs.nhs.uk/candidate/jobadvert/nhs1</link><closingDate>2026-10-01</closingDate></item></channel></rss>')});
 const status=await service.refresh();assert.equal(status.counts.expired,1);assert.equal((await service.browse(new URLSearchParams())).total,0);assert.equal((await service.browse(new URLSearchParams({includeExpired:'1'}))).total,1);
});
test('public boards collect and render UK vacancies without API credentials',async()=>{
 const service=createJobService({env:{JOB_EMPLOYER_BOARDS:'[{"provider":"greenhouse","board":"example","company":"Example"}]'},storePath:null,now:()=>when,fetcher:async()=>new Response(JSON.stringify({jobs:[{id:1,title:'Administrator',location:{name:'Bristol, UK'},absolute_url:'https://example.com/1',content:'<p>Full job description</p>'}]}))});
 const status=await service.refresh();assert.equal(status.counts.total,1);assert.equal(status.sources[0].type,'greenhouse');const result=await service.browse(new URLSearchParams());assert.equal(result.jobs[0].company,'Example');assert.equal(result.jobs[0].excerpt,false);
});

test('removed provider credentials cannot activate collection and legacy listings stay out of searches',async()=>{
 const {createCatalogue}=await import('./job-catalogue.js');const catalogue=createCatalogue();
 await catalogue.ingest([{id:'old',source:'Adzuna',title:'Old listing',url:'https://example.com/old'}],when.toISOString());
 const service=createJobService({env:{JOB_EMPLOYER_BOARDS:'[]',ADZUNA_APP_ID:'ignored',ADZUNA_APP_KEY:'ignored'},catalogue,fetcher:()=>assert.fail('unexpected request')});
 const status=await service.refresh();assert.equal(status.sources.length,0);assert.equal(status.counts.total,0);assert.equal((await service.browse(new URLSearchParams())).total,0);assert.equal((await service.lookup(['Adzuna:old'])).length,0);
 // Retain the original on disk/in storage rather than destructively deleting user data.
 assert.equal((await catalogue.read()).jobs.length,1);
});
test('a subsequent successful refresh returns newly published vacancies rather than a fixed list',async()=>{
 let generation=0,time=new Date(when);const service=createJobService({env,storePath:null,now:()=>time,fetcher:async()=>new Response(JSON.stringify({jobs:[{id:String(++generation),title:'Opening '+generation,location:{name:'London'},absolute_url:'https://example.com/'+generation,content:'Automation testing'}]}))});
 await service.refresh();const first=await service.browse(new URLSearchParams());time=new Date(+time+61000);await service.refresh();const second=await service.browse(new URLSearchParams());assert.notEqual(second.catalogueRevision,first.catalogueRevision);assert.ok(second.jobs.some(job=>job.title==='Opening 2'));
});
