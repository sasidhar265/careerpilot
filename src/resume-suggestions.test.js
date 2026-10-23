import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const source=await readFile(new URL('./ResumeSuggestions.jsx',import.meta.url),'utf8');
const compiled=await transform(source,{loader:'jsx',format:'esm'});
const code=compiled.code.replaceAll('"react"',JSON.stringify(import.meta.resolve('react')));
const {ResumeSuggestions}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('shows usable replacement wording and keeps unsupported claims out of proposed edits',()=>{
 const html=renderToStaticMarkup(React.createElement(ResumeSuggestions,{suggestions:[{id:'edit',title:'Experience: clarify testing',detail:'Explain your testing work.',evidence:'Tested releases.',addition:'Validated software releases.',applicable:true},{id:'gap',title:'Skills: confirm SQL',detail:'Supply an example of SQL use.',addition:'Invented SQL experience',applicable:false}],selected:['edit','gap'],setSelected:()=>{},busy:false}));
 assert.match(html,/2 changes chosen/);assert.match(html,/Your current wording/);assert.match(html,/Suggested wording/);assert.match(html,/Validated software releases/);assert.match(html,/aria-pressed="true"/);assert.match(html,/Add this information to your original CV/);assert.equal((html.match(/aria-pressed="true"/g)||[]).length,2);assert.ok(!html.includes('Invented SQL experience'));
});
