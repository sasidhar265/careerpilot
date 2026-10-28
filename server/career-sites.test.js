import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createCareerSearch,parseNhsResults,parseNttResults,parseTechMahindraResults,parseCognizantResults,enrichCareerJob} from './career-sites.js';
const nhs=readFileSync(new URL('../test-fixtures/career-sites/nhs.html',import.meta.url),'utf8');
const ntt=readFileSync(new URL('../test-fixtures/career-sites/nttdata.html',import.meta.url),'utf8');
const form='<input type="hidden" name="__VIEWSTATE" value="test-state"><input type="hidden" name="__EVENTVALIDATION" value="test-validation">';
const tech=(location='LONDON')=>form+`<div><input id="rptJobs_ctl00_HdnJobCode" value="fixture-123"><span>IT</span><div>Test Automation Engineer</div><p>Skills: Playwright<br>Experience: 3 - 5 Years<br>Location: ${location}</p></div>`;
const cognizant='<li class="job-result"><a href="/uki-en/jobs/fixture123/test-engineer/"><h2>Test Engineer</h2></a><span class="location">London, United Kingdom</span></li>';
const clock=()=>new Date('2026-10-24T10:00:00Z');
test('NHS parses captured career HTML with employer, annual salary, dates and advert link',()=>{
 const item=parseNhsResults(nhs).jobs[0];assert.equal(item.title,'Digital Test Lead');assert.equal(item.company,'Royal Berkshire NHS Foundation Trust');assert.equal(item.location,'Reading RG1 5AN');assert.equal(item.salaryMin,57528);assert.equal(item.salaryMax,64750);assert.equal(item.contract,'permanent');assert.equal(item.created,'2026-10-12T00:00:00.000Z');assert.equal(item.closingDate,'2026-10-25T00:00:00.000Z');assert.match(item.url,/\/candidate\/jobadvert\/C9193-26-0684/);assert.equal(item.excerpt,true);
 assert.equal(parseNhsResults(nhs.replace('a year','an hour')).jobs[0].salaryMin,null);
});
test('NTT DATA parses the captured vacancy markup and only emits UK locations',()=>{
 const item=parseNttResults(ntt).jobs[0];assert.equal(item.title,'Solution Architect');assert.equal(item.url,'https://nttdata.jobs/vacancies/6945/');assert.equal(item.location,'London');assert.equal(parseNttResults(ntt.replaceAll('London','Dublin')).jobs.length,0);
});
test('Tech Mahindra extracts UK card summaries and reference numbers without inventing shareable detail links',()=>{
 const item=parseTechMahindraResults(tech()).jobs[0];assert.equal(item.id,'techmahindra:fixture-123');assert.equal(item.title,'Test Automation Engineer');assert.equal(item.location,'LONDON');assert.match(item.description,/Playwright/);assert.equal(item.portalOnly,true);assert.equal(item.excerpt,true);assert.equal(item.url,'https://careers.techmahindra.com/');assert.equal(parseTechMahindraResults(tech('PUNE')).jobs.length,0);
});
test('Cognizant parsing validates links and UK location; its live endpoint remains independently checked',()=>{
 const item=parseCognizantResults(cognizant).jobs[0];assert.equal(item.title,'Test Engineer');assert.equal(item.company,'Cognizant');assert.equal(parseCognizantResults(cognizant.replace('London, United Kingdom','New York, United States')+'<main>No matching jobs</main>').jobs.length,0);
});
test('recognised empty results differ from malformed and access-denied pages',()=>{
 for(const parser of [parseNhsResults,parseNttResults,parseTechMahindraResults,parseCognizantResults]){assert.equal(parser('<main>No matching jobs</main>').jobs.length,0);assert.throws(()=>parser('<html><title>Access denied</title></html>'));}
});
test('detail enrichment preserves source facts and removes executable markup',()=>{
 const item=parseNttResults(ntt).jobs[0],full=enrichCareerJob(item,'<div class="vacancy_description"><h3>Responsibilities</h3><p>Build &amp; test systems.</p><script>secret()</script></div><script type="application/ld+json">{"@type":"JobPosting","datePosted":"2026-10-01","validThrough":"2026-11-01","baseSalary":{"currency":"GBP","value":{"unitText":"YEAR","minValue":50000,"maxValue":60000}}}</script>');assert.equal(full.excerpt,false);assert.match(full.description,/Build & test systems/);assert.ok(!full.description.includes('secret'));assert.equal(full.salaryMin,50000);assert.equal(full.closingDate,'2026-11-01T00:00:00.000Z');
});
test('direct search runs keyword forms, isolates blocked sources, deduplicates requests and reuses cached results',async()=>{
 const calls=[];const fetcher=async(target,options)=>{const url=new URL(target);calls.push({url,options});if(url.hostname==='careers.cognizant.com')return new Response('Forbidden',{status:403});if(url.hostname==='careers.techmahindra.com'){if(options.method==='POST'){const body=new URLSearchParams(options.body);assert.equal(body.get('ctl00$ContentPlaceHolder1$txtAdvanceSearch'),'Test');assert.equal(body.get('__VIEWSTATE'),'test-state');return new Response(tech());}return new Response(form,{headers:{'Set-Cookie':'session=fixture; Secure; HttpOnly'}});}if(url.hostname==='nttdata.jobs')return new Response(url.pathname==='/vacancies/'?ntt:'<div class="vacancy_description">Test systems</div>');if(url.pathname.startsWith('/candidate/search/results'))return new Response(nhs);return new Response('<div class="wrap-paragraphs">Test systems and person specification</div>');};
 const service=createCareerSearch({fetcher,now:clock});const params=new URLSearchParams({what:'Test',sort:'relevance'});const [first,second]=await Promise.all([service.search(params),service.search(params)]);assert.equal(first.total,3);assert.equal(second.total,3);assert.equal(first.sourceStatuses.find(site=>site.id==='cognizant').code,'ACCESS_DENIED');assert.ok(first.sourceStatuses.some(site=>site.id==='nhs'&&site.count===1));const count=calls.length;const cached=await service.search(params);assert.equal(cached.cached,true);assert.equal(calls.length,count);assert.ok(calls.some(call=>call.url.hostname==='nttdata.jobs'&&call.url.searchParams.get('all')==='Test'));
});
test('no keywords makes no upstream requests and invalid filters are rejected',async()=>{
 const service=createCareerSearch({fetcher:()=>assert.fail('unexpected fetch')});assert.equal((await service.search(new URLSearchParams())).jobs.length,0);await assert.rejects(service.search(new URLSearchParams({what:'test',source:'arbitrary-host'})),{status:400});await assert.rejects(service.search(new URLSearchParams({what:'x'.repeat(201)})),{status:400});
});
test('redirects cannot reach other hosts or private endpoints',async()=>{
 const targets=[];const service=createCareerSearch({fetcher:async target=>{targets.push(String(target));return new Response('',{status:302,headers:{Location:'http://127.0.0.1/private'}});}});const result=await service.search(new URLSearchParams({what:'test',source:'NTT DATA'}));assert.equal(targets.length,1);assert.equal(result.sourceStatuses[0].status,'error');assert.equal(result.sourceStatuses[0].code,'INVALID_RESPONSE');
});
test('API exposes direct career search through the same bridge used by signed-in and guest workspaces',async()=>{
 const {createApiHandler}=await import('./api-handler.js'),{guestResponse}=await import('./guest-bridge.js'),{readJobSearchResponse}=await import('../src/job-search-response.js');const {handler}=createApiHandler({jobs:{storePath:null,env:{JOB_EMPLOYER_BOARDS:'[]'},fetcher:async url=>new Response(new URL(url).pathname==='/vacancies/'?ntt:'<div class="vacancy_description">Architecture and software systems</div>')}});const origin='http://localhost:3100';const response=await guestResponse(new Request(origin+'/api/local-workspace/jobs/careers?what=Architect&source=NTT+DATA'),'jobs/careers',handler,origin);assert.equal(response.status,200);const result=await readJobSearchResponse(response);assert.equal(result.jobs[0].title,'Solution Architect');assert.equal(result.careerSites,true);
});
test('a later NHS pagination failure retains successfully retrieved listings with a partial status',async()=>{
 const service=createCareerSearch({now:clock,fetcher:async target=>{const url=new URL(target);if(url.searchParams.get('page')==='2')return new Response('',{status:503});if(url.pathname.startsWith('/candidate/jobadvert/'))return new Response('<div class="wrap-paragraphs">Testing and quality assurance</div>');return new Response(nhs+'<a href="/candidate/search/results?keyword=Test&page=2">Next Page 2</a>');}});const result=await service.search(new URLSearchParams({what:'Test',source:'NHS Jobs'}));assert.equal(result.total,1);assert.equal(result.sourceStatuses[0].status,'partial');assert.match(result.sourceStatuses[0].note,/earlier listings are retained/);
});
