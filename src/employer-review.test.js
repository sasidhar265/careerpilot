import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const source=await readFile(new URL('./EmployerReview.jsx',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'jsx',format:'esm'});
const code=compiled.code.replaceAll('"react"',JSON.stringify(import.meta.resolve('react')));
const {EmployerReview}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('partial employer criteria can be accepted and applied after tailoring',()=>{
 const after={score:50,summary:'Review evidence',gaps:[{}],explicitGaps:[],rows:[{id:'c1',requirement:'Testing',category:'Skill',weight:1,status:'partial',reason:'Needs detail',action:'Explain release testing'}]};
 const props={after,hasTailored:true,busy:false,blocked:false,onAmend:()=>{},onApply:()=>{},acceptedAmendments:{'employer-c1':{title:'Testing',detail:'Explain release testing'}}};
 const html=renderToStaticMarkup(React.createElement(EmployerReview,props));
 assert.match(html,/aria-pressed="true"/);assert.match(html,/Apply accepted changes &amp; tailor again/);assert.match(html,/Explain release testing/);
 const before=renderToStaticMarkup(React.createElement(EmployerReview,{...props,after:null,before:after,hasTailored:false,acceptedAmendments:{}}));
 assert.match(before,/Use this change/);assert.ok(!before.includes('tailor again'));
});
