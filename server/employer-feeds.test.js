import test from 'node:test';
import assert from 'node:assert/strict';
import {employerBoards,normalizeEmployerJobs,fetchEmployerBoard,isUkLocation,plainText} from './employer-feeds.js';
const gh={provider:'greenhouse',board:'example',company:'Example'};
test('board configuration has public starter sources, validates slugs, and supports disabling',()=>{
 assert.ok(employerBoards().length);assert.deepEqual(employerBoards('[]'),[]);assert.throws(()=>employerBoards('[{"provider":"greenhouse","board":"../../localhost"}]'));assert.throws(()=>employerBoards('{}'));assert.equal(employerBoards(JSON.stringify([gh,gh])).length,1);
});
test('Greenhouse includes UK vacancies and decodes full descriptions without inventing posting dates',()=>{
 const jobs=normalizeEmployerJobs(gh,{jobs:[{id:1,title:'Engineer',location:{name:'London, UK'},absolute_url:'https://example.com/jobs/1',content:'&lt;p&gt;Develop &amp;amp; test&lt;/p&gt;',updated_at:'2026-10-22'},{id:2,title:'US engineer',location:{name:'New York'},absolute_url:'https://example.com/jobs/2'},{id:3,title:'Remote engineer',location:{name:'Remote'},absolute_url:'https://example.com/jobs/3'}]});
 assert.equal(jobs.length,1);assert.equal(jobs[0].description,'Develop & test');assert.equal(jobs[0].excerpt,false);assert.equal(jobs[0].created,'');assert.equal(jobs[0].updatedAt,'2026-10-22');assert.equal(jobs[0].id,'example:1');
});
test('Lever retains description sections and only treats annual GBP values as annual salaries',()=>{
 const config={provider:'lever',board:'example',company:'Example'};const posting={id:'1',text:'Nurse',categories:{location:'Manchester, UK',commitment:'Full-time'},hostedUrl:'https://jobs.lever.co/example/1',descriptionPlain:'Overview',lists:[{text:'Requirements',content:'<ul><li>Nursing registration</li></ul>'}],salaryRange:{currency:'GBP',interval:'year',min:30000,max:40000}};
 const [job]=normalizeEmployerJobs(config,[posting]);assert.match(job.description,/Overview/);assert.match(job.description,/Nursing registration/);assert.equal(job.salaryMin,30000);assert.equal(job.hours,'full_time');
 assert.equal(normalizeEmployerJobs(config,[{...posting,salaryRange:{currency:'USD',interval:'year',min:30000}}])[0].salaryMin,null);
});
test('Ashby excludes unlisted and non-UK jobs, while accepting UK secondary locations',()=>{
 const config={provider:'ashby',board:'example',company:'Example'},posting={id:'1',title:'Engineer',isListed:true,location:'London',address:{postalAddress:{addressCountry:'GB'}},jobUrl:'https://jobs.ashbyhq.com/example/1',descriptionPlain:'Build systems',employmentType:'FullTime'};
 assert.equal(normalizeEmployerJobs(config,{jobs:[posting,{...posting,id:'2',isListed:false}]}).length,1);
 assert.equal(normalizeEmployerJobs(config,{jobs:[{...posting,location:'London, Ontario',address:{postalAddress:{addressCountry:'CA'}}}]}).length,0);
 assert.equal(normalizeEmployerJobs(config,{jobs:[{...posting,location:'New York',address:{postalAddress:{addressCountry:'USA'}},secondaryLocations:[{location:'London',address:{addressCountry:'GB'}}]}]}).length,1);
});
test('unknown remote locations and lookalike foreign cities are not assumed UK',()=>{
 for(const value of ['Remote','Europe','London, Ontario','New York','Cambridge, Massachusetts'])assert.equal(isUkLocation(value),false,value);
 assert.equal(isUkLocation('Remote, United Kingdom'),true);assert.equal(isUkLocation('Belfast'),true);assert.equal(plainText('<script>bad()</script><p>Safe</p>'),'Safe');
});
test('public feed requests need no API credentials and reject failed or malformed responses',async()=>{
 const jobs=await fetchEmployerBoard(gh,{fetcher:async(url,options)=>{assert.equal(url.hostname,'boards-api.greenhouse.io');assert.equal(url.searchParams.get('content'),'true');assert.equal(options.headers.Authorization,undefined);assert.equal(options.redirect,'error');return new Response(JSON.stringify({jobs:[{id:1,title:'Engineer',location:{name:'UK'},absolute_url:'https://example.com/1',content:'Description'}]}));}});assert.equal(jobs.length,1);
 await assert.rejects(fetchEmployerBoard(gh,{fetcher:async()=>new Response('no',{status:404})}));await assert.rejects(fetchEmployerBoard(gh,{fetcher:async()=>new Response('{}')}));
});
test('SmartRecruiters collects UK public postings with full detail and no API key',async()=>{
 const requests=[],config={provider:'smartrecruiters',board:'Example',company:'Example'};
 const jobs=await fetchEmployerBoard(config,{fetcher:async(url,options)=>{requests.push(url);assert.equal(options.headers.Authorization,undefined);if(url.pathname.endsWith('/postings')){assert.equal(url.searchParams.get('destination'),'PUBLIC');assert.equal(url.searchParams.get('country'),'gb');return new Response(JSON.stringify({content:[{id:'1',name:'Test Automation Engineer',location:{city:'Belfast',country:'gb'},releasedDate:'2026-10-22T12:00:00Z',typeOfEmployment:{label:'Full-time'}}],totalFound:1}));}return new Response(JSON.stringify({id:'1',postingUrl:'https://jobs.smartrecruiters.com/Example/1-engineer',jobAd:{sections:{jobDescription:{title:'Role',text:'<p>Build automated tests.</p>'},qualifications:{text:'Selenium experience'}}}}));}});
 assert.equal(requests.length,2);assert.equal(jobs.length,1);assert.equal(jobs[0].source,'SmartRecruiters');assert.equal(jobs[0].excerpt,false);assert.match(jobs[0].description,/Selenium experience/);assert.equal(jobs[0].created,'2026-10-22T12:00:00Z');
});
test('SmartRecruiters detail failures retain honest summaries and reject non-UK jobs',async()=>{
 const config={provider:'smartrecruiters',board:'Example',company:'Example'};
 const jobs=await fetchEmployerBoard(config,{fetcher:async url=>url.pathname.endsWith('/postings')?new Response(JSON.stringify({content:[{id:'1',name:'QA Engineer',location:{city:'London',country:'gb'}},{id:'2',name:'QA Engineer US',location:{city:'Boston',country:'us'}}],totalFound:2})):new Response('unavailable',{status:503})});
 assert.equal(jobs.length,1);assert.equal(jobs[0].excerpt,true);assert.match(jobs.collectionNote,/1 detail requests failed/);
});
