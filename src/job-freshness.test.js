import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
async function load(relative){const compiled=await build({entryPoints:[new URL(relative,import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'node',packages:'external'});const code=compiled.outputFiles[0].text.replaceAll('"react"',JSON.stringify(import.meta.resolve('react'))).replaceAll('"lucide-react"',JSON.stringify(import.meta.resolve('lucide-react')));return import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));}
const {JobFreshness}=await load('./JobFreshness.jsx');
const {JobSearch}=await load('./JobSearch.jsx');
test('freshness distinguishes unobserved, recently seen, stale and expired listings',()=>{
 const render=job=>renderToStaticMarkup(React.createElement(JobFreshness,{job}));
 assert.match(render({}),/Availability not checked/);
 const job={lastSeenAt:'2026-10-22T12:00:00Z'};assert.match(render({...job,availability:'recent'}),/Recently seen/);assert.match(render({...job,availability:'stale'}),/Not seen in over 7 days/);assert.match(render({...job,availability:'expired',closingDate:'2026-10-21'}),/Past source closing date/);
});
test('search exposes live and collected sources without fabricated initial vacancies',()=>{
 const html=renderToStaticMarkup(React.createElement(JobSearch,{onTailor:()=>{},onChange:()=>{}}));
 for(const text of ['All sources','Greenhouse','Lever','Ashby','Job sources &amp; freshness','Search NHS Jobs'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('job-result-top'));assert.ok(!html.includes('Adzuna'));assert.ok(!html.includes('Search in'));
});
