import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HISTORY_KEY,loadHistory,addHistory,persistHistory} from './resume-history.js';
const entry=(n,kind='edited')=>({id:`entry-${kind}-${n}`,kind,savedAt:new Date(Date.UTC(2026,9,3,12,n)).toISOString(),text:`Alex Example\nSoftware developer with documented responsibilities and experience. Revision ${n}`,original:'Original source experience',jobDescription:'Original job description',job:{title:'Developer',keywords:['SQL'],responsibilities:['Build software'],requirements:['Testing']},reviewNotes:['Verify details.']});
test('retains newest ten edits and ten finalized resumes separately',()=>{
 let entries=[];for(let n=0;n<15;n++){entries=addHistory(entries,entry(n,n%2?'created':'edited'));entries=addHistory(entries,entry(n,'final'));}
 assert.equal(entries.length,20);
 assert.equal(entries.filter(e=>e.kind==='final').length,10);
 assert.equal(entries.filter(e=>e.kind!=='final').length,10);
 assert.equal(entries[0].savedAt,entry(14).savedAt);assert.ok(entries.every(e=>Number(e.id.split('-').at(-1))>=5));
});
test('reload preserves exact resume and job context, without duplicate saves',()=>{
 const item=entry(1);let entries=addHistory([],item);entries=addHistory(entries,{...item,id:'duplicate',savedAt:entry(2).savedAt});assert.equal(entries.length,1);
 const storage={value:'',setItem(key,value){assert.equal(key,HISTORY_KEY);this.value=value;},getItem(){return this.value;}};
 assert.equal(persistHistory(storage,entries),true);assert.deepEqual(loadHistory(storage),entries);
 assert.equal(addHistory(entries,{...item,id:'different-job',jobDescription:'Another job description'}).length,2);
});
test('corrupt or inaccessible storage does not prevent using the app',()=>{
 for(const data of ['not JSON','{}','[null, {"kind":"edited"}]'])assert.deepEqual(loadHistory({getItem:()=>data}),[]);
 assert.deepEqual(loadHistory({getItem(){throw new Error('Denied');}}),[]);
 assert.equal(persistHistory({setItem(){throw new Error('Full');}},[entry(1)]),false);
 assert.deepEqual(addHistory([],{...entry(1),job:{keywords:[]}}),[]);
});
