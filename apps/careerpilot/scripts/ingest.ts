import 'dotenv/config';
import {setTimeout as pause} from 'node:timers/promises';
import {ingestEmployers} from '../src/server/jobs/ingest';
import {db} from '../src/server/db/client';
let stopping=false,firstRun=true;const controller=new AbortController();for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;controller.abort();});
try{do{console.log(JSON.stringify(await ingestEmployers({force:firstRun&&process.argv.includes('--force')})));firstRun=false;if(!process.argv.includes('--watch'))break;await pause(60*1000,undefined,{signal:controller.signal}).catch(()=>{});}while(!stopping);}finally{await db().$disconnect();}
