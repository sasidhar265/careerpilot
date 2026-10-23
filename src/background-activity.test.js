import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const source=await readFile(new URL('./BackgroundActivity.jsx',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'jsx',format:'esm'});
const code=compiled.code.replaceAll('"react"',JSON.stringify(import.meta.resolve('react'))).replaceAll('"lucide-react"',JSON.stringify(import.meta.resolve('lucide-react')));
const {BackgroundActivity}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('background popup remains hidden when idle and announces provider checks',()=>{
 assert.equal(renderToStaticMarkup(React.createElement(BackgroundActivity,{busy:false,checkingProviders:false})), '');
 const html=renderToStaticMarkup(React.createElement(BackgroundActivity,{busy:false,checkingProviders:true}));
 assert.match(html,/Checking AI access/);assert.match(html,/role="status"/);assert.match(html,/aria-live="polite"/);
});
test('background popup explains each running task and selected provider',()=>{
 for(const [status,expected] of [['AI is analyzing the job description…','Analyzing the job'],['AI is comparing your experience with the role…','Comparing your resume'],['AI is building your complete tailored resume…','Applying accepted changes'],['AI is refining supported JD alignment…','Improving JD alignment'],['AI is reviewing employer requirements…','Reviewing employer fit'],['Preparing your PDF download…','Preparing your download'],['Recognizing scanned text…','Reading your document']]){
 const html=renderToStaticMarkup(React.createElement(BackgroundActivity,{busy:true,checkingProviders:false,status,provider:'Copilot · Account model'}));
 assert.ok(html.includes(expected),status);if(!status.includes('download'))assert.match(html,/Account model/);else assert.ok(!html.includes('AI:'));
 }
});
