import 'dotenv/config';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {importPosting} from '../src/server/jobs/ingest';
import {db} from '../src/server/db/client';
const path=resolve(process.env.LEGACY_CATALOGUE_PATH||'../../.data/jobs.json');
try{const data=JSON.parse(await readFile(path,'utf8'));if(!Array.isArray(data.jobs)||data.jobs.length>10000)throw Error('Invalid catalogue.');let imported=0,skipped=0;for(const item of data.jobs){if(!['Greenhouse','Lever','Ashby','SmartRecruiters','NHS Jobs'].includes(item.source)){skipped++;continue;}await importPosting(item);imported++;}console.log(JSON.stringify({imported,skipped,sourceChanged:false}));}finally{await db().$disconnect();}
