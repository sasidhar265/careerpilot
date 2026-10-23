import {existsSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const app=fileURLToPath(new URL('..',import.meta.url)),environment=fileURLToPath(new URL('../.env',import.meta.url));if(existsSync(environment))process.loadEnvFile(environment);
const suite=process.argv[2],connection=suite==='integration'?(process.env.INTEGRATION_DATABASE_URL||process.env.E2E_DATABASE_URL):process.env.E2E_DATABASE_URL;
let valid=false;try{const url=new URL(connection||'');valid=['postgresql:','postgres:'].includes(url.protocol)&&url.pathname.endsWith('_test');}catch{}
if(!valid){console.error('Required release tests need an explicit isolated PostgreSQL *_test URL; a skipped suite is not a passing release gate.');process.exit(1);}
let args;
if(suite==='integration')args=['--conditions=react-server','--import','tsx','--test',...readdirSync(new URL('../tests/integration',import.meta.url)).filter(name=>name.endsWith('.test.ts')).map(name=>fileURLToPath(new URL('../tests/integration/'+name,import.meta.url)))];
else if(suite==='journey'){if(process.env.E2E_PROVIDER_FIXTURES!=='1'){console.error('The isolated journey suite requires E2E_PROVIDER_FIXTURES=1; live-provider validation is a separate staging gate.');process.exit(1);}args=[fileURLToPath(new URL('../node_modules/@playwright/test/cli.js',import.meta.url)),'test','primary-journey.spec.ts'];}
else{console.error('Choose integration or journey.');process.exit(1);}
const result=spawnSync(process.execPath,args,{cwd:app,env:process.env,stdio:'inherit'});if(result.error)console.error('Required test process could not start.');process.exitCode=result.status??1;
