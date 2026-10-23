import test from 'node:test';
import assert from 'node:assert/strict';
import {parseNhsFeed,fetchNhsFeed} from './nhs-feed.js';
const xml=`<rss><channel><item><guid>ref1</guid><title>Nurse &amp; Midwife</title><link>https://www.jobs.nhs.uk/candidate/jobadvert/ref1</link><description><![CDATA[<p>Person specification</p>]]></description><employer>Test NHS Trust</employer><location>Leeds</location><closingDate>2026-11-01</closingDate></item></channel></rss>`;
test('parses NHS RSS without executing description markup',()=>{
 const jobs=parseNhsFeed(xml);assert.equal(jobs.length,1);assert.equal(jobs[0].title,'Nurse & Midwife');assert.equal(jobs[0].company,'Test NHS Trust');assert.equal(jobs[0].description,'Person specification');assert.equal(jobs[0].closingDate,'2026-11-01T00:00:00.000Z');assert.equal(jobs[0].source,'NHS Jobs');assert.equal(jobs[0].excerpt,true);
});
test('supports Atom alternate links and valid empty RSS',()=>{
 const jobs=parseNhsFeed('<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>atom1</id><title>Administrator</title><link rel="alternate" href="https://www.jobs.nhs.uk/candidate/jobadvert/atom1"/><summary>Details</summary></entry></feed>');assert.equal(jobs.length,1);assert.equal(parseNhsFeed('<rss><channel/></rss>').length,0);
});
test('rejects DTDs, oversized XML, malformed XML, HTML and unsupported listing destinations',()=>{
 for(const input of ['<!DOCTYPE rss><rss/>','<!ENTITY x "x"><rss/>','<html>Blocked</html>','<rss>','x'.repeat(5000001)])assert.throws(()=>parseNhsFeed(input));
 assert.equal(parseNhsFeed(xml.replace('https://www.jobs.nhs.uk/candidate/jobadvert/ref1','javascript:alert(1)')).length,0);
});
test('only requests configured HTTPS NHS hosts and refuses redirects',async()=>{
 for(const url of ['http://www.jobs.nhs.uk/feed','https://example.com/feed','https://localhost/feed','https://user:password@www.jobs.nhs.uk/feed'])await assert.rejects(fetchNhsFeed(url,{fetcher:()=>assert.fail('must not fetch')}));
 const result=await fetchNhsFeed('https://www.jobs.nhs.uk/feed',{fetcher:async(url,options)=>{assert.equal(options.redirect,'error');return new Response(xml);}});assert.equal(result.length,1);
});
