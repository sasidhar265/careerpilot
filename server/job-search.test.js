import test from 'node:test';
import assert from 'node:assert/strict';
import {keywordMatch} from './job-search.js';
import {createCatalogue,filterCatalogue} from './job-catalogue.js';
test('test automation matches inflections and punctuation without substring false positives',()=>{
 for(const title of ['Test Automation Engineer','Automation Testing Engineer','Automated Test Engineer','Test-Automation Engineer'])assert.equal(keywordMatch({title},'Test Automation').matches,true,title);
 assert.equal(keywordMatch({title:'Latest Automation News'},'Test Automation').matches,false);
 assert.equal(keywordMatch({title:'Automation Engineer',description:'testing services'},' TEST   automation ').matches,true);
 assert.equal(keywordMatch({title:'Accounting',description:'latest automation tools'},'test automation').matches,false);
});
test('relevance ranks titles before incidental description matches',async()=>{
 const store=createCatalogue(),date='2026-10-22T12:00:00Z';await store.ingest([{id:'1',source:'Example',title:'Data Engineer',description:'Uses test automation',url:'https://example.com/1'},{id:'2',source:'Example',title:'Test Automation Engineer',description:'Build systems',url:'https://example.com/2'}],date);
 const result=filterCatalogue(await store.read(),new URLSearchParams({what:'Test Automation',sort:'relevance'}),new Date(date));assert.equal(result.total,2);assert.equal(result.jobs[0].id,'2');
});
test('empty results explain unknown metadata and retain keyword-only counts',async()=>{
 const store=createCatalogue(),date='2026-10-22T12:00:00Z';await store.ingest([{id:'1',source:'Example',title:'Test Automation Engineer',location:'London',url:'https://example.com/1'}],date);
 const result=filterCatalogue(await store.read(),new URLSearchParams({what:'Test Automation',days:'7',salary_min:'40000',contract:'permanent'}),new Date(date));assert.equal(result.total,0);assert.equal(result.diagnostics.keywordTotal,1);assert.equal(result.diagnostics.excludedBy.date,1);assert.equal(result.diagnostics.excludedBy.salary,1);assert.equal(result.diagnostics.excludedBy.contract,1);
});
test('source selection filters public employer providers',async()=>{
 const store=createCatalogue();await store.ingest([{id:'1',source:'Greenhouse',title:'Automation Engineer',url:'https://example.com/one'},{id:'2',source:'Lever',title:'Automation Engineer',url:'https://example.com/two'}]);
 const result=filterCatalogue(await store.read(),new URLSearchParams({what:'automation',source:'Lever'}));assert.equal(result.total,1);assert.equal(result.jobs[0].source,'Lever');
});
