import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {TRACKER_KEY,readTracker,changeTrackedJob,jobKey,safeLink} from './job-tracker.js';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
const source=await readFile(new URL('./ApplicationTracker.jsx',import.meta.url),'utf8');
const compiled=await build({entryPoints:[new URL('./ApplicationTracker.jsx',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',packages:'external'});
const code=compiled.outputFiles[0].text.replaceAll('"react"',JSON.stringify(import.meta.resolve('react'))).replaceAll('"lucide-react"',JSON.stringify(import.meta.resolve('lucide-react'))).replaceAll('"./job-tracker.js"',JSON.stringify(new URL('./job-tracker.js',import.meta.url).href));
const {ApplicationTracker}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const job={id:'1',source:'Adzuna',title:'NHS nurse',company:'Test Trust',url:'https://example.com/1',description:'Job requirements',excerpt:true};
const when='2026-10-22T12:00:00.000Z';
test('save, hide, restore and reload preserve independent status and notes',()=>{
 let records=changeTrackedJob([],job,{saved:true},when);
 records=changeTrackedJob(records,job,{status:'Applied',notes:'Interview contact',deadline:'2026-11-01'},when);
 records=changeTrackedJob(records,job,{hidden:true},when);
 const loaded=readTracker({getItem:key=>{assert.equal(key,TRACKER_KEY);return JSON.stringify(records);}});
 assert.equal(loaded[0].saved,true);assert.equal(loaded[0].hidden,true);assert.equal(loaded[0].status,'Applied');assert.equal(loaded[0].appliedAt,'2026-10-22');assert.equal(loaded[0].notes,'Interview contact');
 records=changeTrackedJob(loaded,job,{hidden:false},when);assert.equal(records[0].status,'Applied');assert.equal(records[0].deadline,'2026-11-01');assert.equal(records.length,1);
});
test('job identifiers are scoped by source and updates keep list order',()=>{
 let records=changeTrackedJob([],job,{saved:true},when);
 records=changeTrackedJob(records,{...job,source:'Manual'},{saved:true},when);
 records=changeTrackedJob(records,job,{notes:'Changed'},when);
 assert.equal(records.length,2);assert.equal(records[0].job.source,'Manual');assert.equal(records[1].notes,'Changed');assert.notEqual(jobKey(records[0].job),jobKey(records[1].job));
});
test('status transitions preserve application date and permit correction',()=>{
 let records=changeTrackedJob([],job,{status:'Applied'},when);
 records=changeTrackedJob(records,job,{status:'Interview'},'2026-10-23T12:00:00Z');assert.equal(records[0].appliedAt,'2026-10-22');
 records=changeTrackedJob(records,job,{status:'Offer',appliedAt:'2026-10-20'},when);assert.equal(records[0].saved,true);assert.equal(records[0].appliedAt,'2026-10-20');
});
test('corrupt or inaccessible storage reports failure; malformed records and unsafe links are excluded',()=>{
 assert.throws(()=>readTracker({getItem:()=>'{broken'}));assert.throws(()=>readTracker({getItem:()=>{throw Error('unavailable');}}));assert.throws(()=>readTracker({getItem:()=>'{}'}));
 const loaded=readTracker({getItem:()=>JSON.stringify([null,{job:{}},{job:{...job,url:'javascript:alert(1)'},status:'unknown',notes:99}])});assert.equal(loaded.length,1);assert.equal(loaded[0].job.url,'');assert.equal(loaded[0].status,'Saved');assert.equal(loaded[0].notes,'');assert.equal(safeLink('data:text/html,test'),'');
});
test('invalid updates cannot corrupt saved data',()=>{
 const records=changeTrackedJob([],job,{saved:true},when);
 const next=changeTrackedJob(records,job,{status:'invalid',deadline:'nonsense',notes:'x'.repeat(11000)},when);assert.equal(next[0].status,'Saved');assert.equal(next[0].deadline,'');assert.equal(next[0].notes.length,10000);assert.deepEqual(changeTrackedJob(records,{},{}),records);
});

test('tracker exposes stored job actions and escapes document content',()=>{
 const records=changeTrackedJob([], {...job,description:'<script>bad()</script>'},{saved:true,notes:'Call recruitment'},when);
 const html=renderToStaticMarkup(React.createElement(ApplicationTracker,{records,onChange:()=>{},onRemove:()=>{},onTailor:()=>{}}));
 for(const text of ['NHS nurse','Call recruitment','Application status','Closing date','Applied on','Prepare application','Hide job','Remove'])assert.ok(html.includes(text),text);
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
test('hidden jobs stay out of the default tracker list',()=>{
 const records=changeTrackedJob([],job,{saved:true,hidden:true},when);
 const html=renderToStaticMarkup(React.createElement(ApplicationTracker,{records}));
 assert.ok(!html.includes('NHS nurse'));assert.ok(html.includes('No matching opportunities yet.'));
});
