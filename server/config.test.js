import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadConfiguration} from './config.js';
function fixture(run){const root=mkdtempSync(join(tmpdir(),'align-config-'));try{run(root);}finally{rmSync(root,{recursive:true,force:true});}}
test('loads configuration from an explicit project root and handles blank inherited values',()=>fixture(root=>{writeFileSync(join(root,'.env'),'OPENAI_API_KEY="test-key"\nOPENAI_MODEL=gpt-4.1\n');const env={OPENAI_API_KEY:''};const result=loadConfiguration({root,env});assert.equal(result.configured,true);assert.equal(env.OPENAI_API_KEY,'test-key');assert.deepEqual(result.loaded,['.env']);}));
test('server file and local override load in order; actual environment takes precedence',()=>fixture(root=>{mkdirSync(join(root,'server'));writeFileSync(join(root,'server/.env'),'OPENAI_API_KEY=server-test');writeFileSync(join(root,'.env'),'OPENAI_API_KEY=root-test');writeFileSync(join(root,'.env.local'),'OPENAI_API_KEY=local-test');const env={};loadConfiguration({root,env});assert.equal(env.OPENAI_API_KEY,'local-test');const inherited={OPENAI_API_KEY:'environment-test'};loadConfiguration({root,env:inherited});assert.equal(inherited.OPENAI_API_KEY,'environment-test');}));
test('template does not enable AI; BOM is supported',()=>fixture(root=>{writeFileSync(join(root,'.env.example'),'OPENAI_API_KEY=example');assert.equal(loadConfiguration({root,env:{}}).configured,false);writeFileSync(join(root,'.env'),'\uFEFFOPENAI_API_KEY=bom-test');assert.equal(loadConfiguration({root,env:{}}).configured,true);}));
test('public feed settings load from env files while real environment wins',()=>fixture(root=>{writeFileSync(join(root,'.env'),"JOB_EMPLOYER_BOARDS='[]'\nNHS_JOBS_FEED_URL=https://www.jobs.nhs.uk/feed\nJOB_REFRESH_MINUTES=30\nJOB_AUTO_REFRESH=false\n");const env={JOB_REFRESH_MINUTES:'60'};loadConfiguration({root,env});assert.equal(env.JOB_EMPLOYER_BOARDS,'[]');assert.equal(env.JOB_AUTO_REFRESH,'false');assert.equal(env.JOB_REFRESH_MINUTES,'60');}));
