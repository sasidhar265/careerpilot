import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import * as icons from 'lucide-react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import {linkedInSearchUrl} from './linkedin-search.js';
import {readJobSearchResponse} from './job-search-response.js';
import {applicationFetch} from './http-client.js';
import {jobKey} from './job-tracker.js';
import {createCatalogue,filterCatalogue} from '../server/job-catalogue.js';
const source=await readFile(new URL('./JobSearch.jsx',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'jsx',format:'cjs'});
// Exercise the component's actual handlers, effects and request state without a browser.
const sourcesCompiled=await transform(await readFile(new URL('./JobSources.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs'});
function mount(props={},component='JobSearch',code=compiled.code){
 const slots=[];let cursor=0,tree,queued=false,disposed=false;const effects=[];
 const schedule=()=>{if(!queued&&!disposed){queued=true;queueMicrotask(()=>{queued=false;if(!disposed)render();});}};
 const hooks={...React,useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;schedule();}}];},useRef(initial){const i=cursor++;return slots[i]||(slots[i]={current:initial});},useEffect(effect,deps){const i=cursor++;const prior=slots[i];if(!prior||!deps||deps.some((value,index)=>!Object.is(value,prior.deps[index]))){slots[i]={deps,cleanup:prior?.cleanup};effects.push(()=>{slots[i].cleanup?.();slots[i].cleanup=effect();});}}};
 const module={exports:{}};new Function('require','module','exports',code)(name=>{
 if(name==='./linkedin-search.js')return {linkedInSearchUrl};
 if(name==='./job-search-response.js')return {readJobSearchResponse};
 if(name==='./http-client.js')return {applicationFetch};
 if(name==='react')return hooks;if(name==='lucide-react')return icons;if(name==='./job-tracker.js')return {jobKey};
 if(name==='./EmployerDirectory.jsx')return {EmployerDirectory:()=>null};
 if(name==='./JobSources.jsx')return {JobSources:()=>React.createElement('section',null,'Job sources & freshness')};
 if(name==='./JobFreshness.jsx')return {JobFreshness:()=>null};throw Error(name);
 },module,module.exports);
 function render(){cursor=0;tree=module.exports[component]({onChange:()=>{},onTailor:()=>{},...props});const pending=effects.splice(0);for(const effect of pending)effect();}
 render();return {get tree(){return tree;},html:()=>renderToStaticMarkup(tree),dispose(){disposed=true;for(const slot of slots)slot?.cleanup?.();}};
}
function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of React.Children.toArray(tree.props?.children)){const found=find(child,predicate);if(found)return found;}return null;}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function fixture(){const store=createCatalogue();await store.ingest([{id:'test',source:'Example',title:'Test Automation Engineer',description:'Automated testing',location:'London',url:'https://example.com/test'},{id:'other',source:'Example',title:'Nurse',description:'Patient care',location:'Leeds',url:'https://example.com/other'}]);return store.read();}
test('submitting a career-site keyword sends a filtered request and renders matching cards above source panels',async()=>{
 const state=await fixture(),oldFetch=globalThis.fetch,requests=[];globalThis.fetch=async input=>{const url=new URL(input,'http://localhost');requests.push(url);return {ok:true,json:async()=>filterCatalogue(state,url.searchParams)};};
 const app=mount();try{
 await flush();assert.match(app.html(),/Nurse/);
 find(app.tree,node=>node.props?.placeholder==='Nurse, administrator, developer…').props.onChange({target:{value:'Test Automation'}});
 await new Promise(resolve=>setTimeout(resolve,400));await flush();assert.equal(requests.length,1);find(app.tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});await flush();
 const html=app.html();assert.equal(requests.at(-1).searchParams.get('what'),'Test Automation');assert.match(html,/Test Automation Engineer/);assert.ok(!html.includes('<h2>Nurse</h2>'));assert.ok(html.indexOf('Test Automation Engineer')<html.indexOf('Job sources &amp; freshness'));assert.match(html,/1 shown on this page/);
 }finally{app.dispose();globalThis.fetch=oldFetch;await flush();}
});
test('an older response cannot replace the current keyword result',async()=>{
 const state=await fixture(),oldFetch=globalThis.fetch;let initialResolve;globalThis.fetch=async input=>{const url=new URL(input,'http://localhost');if(!url.searchParams.get('what'))return new Promise(resolve=>initialResolve=resolve);return {ok:true,json:async()=>filterCatalogue(state,url.searchParams)};};
 const app=mount();try{
 find(app.tree,node=>node.props?.placeholder==='Nurse, administrator, developer…').props.onChange({target:{value:'Test Automation'}});await flush();
 find(app.tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});await flush();
 initialResolve({ok:true,json:async()=>filterCatalogue(state,new URLSearchParams())});await flush();assert.match(app.html(),/Test Automation Engineer/);assert.ok(!app.html().includes('<h2>Nurse</h2>'));
 }finally{app.dispose();globalThis.fetch=oldFetch;await flush();}
});
test('hidden matches can be displayed without changing tracker preferences',async()=>{
 const state=await fixture(),oldFetch=globalThis.fetch;globalThis.fetch=async input=>({ok:true,json:async()=>filterCatalogue(state,new URL(input,'http://localhost').searchParams)});
 const app=mount({records:[{job:{source:'Example',id:'test'},hidden:true}]});try{
 await flush();assert.ok(!app.html().includes('<h2>Test Automation Engineer</h2>'));
 const label=find(app.tree,node=>node.type==='label'&&React.Children.toArray(node.props.children).some(child=>typeof child==='string'&&child.includes('Show hidden matches')));
 find(label,node=>node.type==='input').props.onChange({target:{checked:true}});await flush();assert.match(app.html(),/<h2>Test Automation Engineer<\/h2>/);
 }finally{app.dispose();globalThis.fetch=oldFetch;await flush();}
});
test('invalid backend responses show an actionable error rather than an empty screen',async()=>{
 const oldFetch=globalThis.fetch;globalThis.fetch=async()=>({ok:true,json:async()=>({unexpected:true})});const app=mount();try{await flush();assert.match(app.html(),/unexpected data format/);assert.ok(!app.html().includes('Searching UK listings…'));}finally{app.dispose();globalThis.fetch=oldFetch;await flush();}
});

test('idle source polling detects a new catalogue revision and asks the result view to reload',async()=>{
 const oldFetch=globalThis.fetch,oldInterval=globalThis.setInterval,oldClear=globalThis.clearInterval,callbacks=new Map();let timer=0,calls=0,reloads=0;
 globalThis.setInterval=callback=>{callbacks.set(++timer,callback);return timer;};globalThis.clearInterval=id=>callbacks.delete(id);
 globalThis.fetch=async()=>({ok:true,json:async()=>({catalogueRevision:'revision-'+(++calls),refreshing:false,sources:[],automatic:false,counts:{total:calls,recent:calls,stale:0,expired:0}})});
 const app=mount({onRefreshed:()=>reloads++},'JobSources',sourcesCompiled.code);
 try{await flush();assert.equal(reloads,0);assert.equal(callbacks.size,1);[...callbacks.values()][0]();await flush();assert.equal(reloads,1);assert.match(app.html(),/2 collected/);}finally{app.dispose();globalThis.fetch=oldFetch;globalThis.setInterval=oldInterval;globalThis.clearInterval=oldClear;await flush();}
});

test('HTML search failures show a retry action that recovers with genuine search data',async()=>{const state=await fixture(),oldFetch=globalThis.fetch;let fail=true;globalThis.fetch=async input=>fail?new Response('<html>server compile failure</html>',{status:500}):Response.json(filterCatalogue(state,new URL(input,'http://localhost').searchParams));const app=mount();try{await flush();assert.match(app.html(),/HTTP 500/);assert.ok(!app.html().includes('server compile failure'));fail=false;find(app.tree,node=>node.type==='button'&&node.props.children==='Retry search').props.onClick();await flush();assert.match(app.html(),/Test Automation Engineer/);assert.ok(!app.html().includes('HTTP 500'));}finally{app.dispose();globalThis.fetch=oldFetch;await flush();}});
test('career-site search selects the direct backend and shows blocked sources alongside real results',async()=>{
 const state=await fixture(),oldFetch=globalThis.fetch,requests=[];globalThis.fetch=async input=>{const url=new URL(input,'http://localhost');requests.push(url);return Response.json({...filterCatalogue(state,url.searchParams),catalogue:false,careerSites:true,message:'Direct career-site search',sourceStatuses:[{id:'cognizant',company:'Cognizant',careersUrl:'https://careers.cognizant.com/',status:'error',count:0,error:'Automated access denied (HTTP 403).'}]});};const app=mount();try{await flush();find(app.tree,node=>node.props?.placeholder==='Nurse, administrator, developer…').props.onChange({target:{value:'Test Automation'}});await flush();find(app.tree,node=>node.type==='form').props.onSubmit({preventDefault(){}});await flush();assert.equal(requests.at(-1).pathname,'/api/jobs/careers');assert.match(app.html(),/Test Automation Engineer/);assert.match(app.html(),/Automated access denied/);assert.match(app.html(),/Career-site listings/);}finally{app.dispose();globalThis.fetch=oldFetch;await flush();}
});
test('catalogue mode retains automatic filtering when keywords change',async()=>{
 const state=await fixture(),oldFetch=globalThis.fetch,requests=[];globalThis.fetch=async input=>{const url=new URL(input,'http://localhost');requests.push(url);return Response.json(filterCatalogue(state,url.searchParams));};const app=mount();try{await flush();const scope=find(app.tree,node=>node.type==='select'&&React.Children.toArray(node.props.children).some(child=>child.props?.value==='catalogue'));scope.props.onChange({target:{value:'catalogue'}});await flush();find(app.tree,node=>node.props?.placeholder==='Nurse, administrator, developer…').props.onChange({target:{value:'Test Automation'}});await new Promise(resolve=>setTimeout(resolve,400));await flush();assert.equal(requests.at(-1).pathname,'/api/jobs/catalogue');assert.equal(requests.at(-1).searchParams.get('what'),'Test Automation');assert.match(app.html(),/Test Automation Engineer/);}finally{app.dispose();globalThis.fetch=oldFetch;await flush();}
});
