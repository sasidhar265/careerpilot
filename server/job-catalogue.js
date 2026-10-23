import {keywordMatch} from './job-search.js';
import {readFile,mkdir,writeFile,rename,stat} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {safeJobUrl} from './jobs.js';
export function canonicalUrl(value){
 const safe=safeJobUrl(value);if(!safe)return '';
 const url=new URL(safe);url.hash='';for(const key of [...url.searchParams.keys()])if(/^utm_|^(fbclid|gclid)$/i.test(key))url.searchParams.delete(key);
 url.searchParams.sort();url.hostname=url.hostname.toLowerCase();url.pathname=url.pathname.replace(/\/$/,'')||'/';return url.href;
}
export function availability(job,now=new Date()){
 if(job.closingDate&&Date.parse(job.closingDate.slice(0,10)+'T23:59:59.999Z')<+now)return 'expired';
 return !job.lastSeenAt||+now-Date.parse(job.lastSeenAt)>7*86400000?'stale':'recent';
}
export function mergeListings(state,jobs,now=new Date().toISOString()){
 const records=structuredClone(state.jobs),index=new Map();
 for(const record of records){for(const alias of record.aliases)index.set(alias,record);index.set('url:'+record.canonicalUrl,record);}
 for(const job of jobs){
 const url=canonicalUrl(job.url);if(!url||!job.title||!job.id||!job.source)continue;
 const alias=job.source+':'+job.id;
 let record=index.get(alias)||index.get('url:'+url);
 if(!record){record={catalogueId:createHash('sha256').update(alias).digest('hex').slice(0,24),firstSeenAt:now,aliases:[],sources:[]};records.push(record);}
 const firstSeenAt=record.firstSeenAt,aliases=[...new Set([...record.aliases,alias])],sources=[...new Set([...record.sources,job.source])];
 // Prefer a full description over an excerpt when duplicate sources share a URL.
 const content=record.excerpt===false&&job.excerpt!==false?{...job,description:record.description,excerpt:false}:job;
 Object.assign(record,content,{catalogueId:record.catalogueId,firstSeenAt,lastSeenAt:now,canonicalUrl:url,aliases,sources});
 index.set(alias,record);index.set('url:'+url,record);
 }
 // Bound local storage; pruning is not evidence that a job closed.
 return {...state,jobs:records.sort((a,b)=>b.lastSeenAt.localeCompare(a.lastSeenAt)).slice(0,10000)};
}
export function createCatalogue({path=null}={}){
 let state=null,signature=null,queue=Promise.resolve();
 async function load(){if(!path)return state||(state={version:1,jobs:[],runs:{}});try{const info=await stat(/*turbopackIgnore: true*/ path);const currentSignature=[info.ino,info.mtimeMs,info.ctimeMs,info.size].join(':');if(state&&signature===currentSignature)return state;const parsed=JSON.parse(await readFile(/*turbopackIgnore: true*/ path,'utf8'));if(parsed.version!==1||!Array.isArray(parsed.jobs)||parsed.jobs.length>10000||parsed.jobs.some(job=>!job||typeof job.catalogueId!=='string'||typeof job.canonicalUrl!=='string'||!Array.isArray(job.aliases)||!Array.isArray(job.sources)||typeof job.lastSeenAt!=='string'||typeof job.title!=='string')||!parsed.runs||typeof parsed.runs!=='object')throw Error('Invalid catalogue');signature=currentSignature;return state=parsed;}catch(e){if(e.code==='ENOENT'){signature=null;return state={version:1,jobs:[],runs:{}};}throw Error('The local job catalogue could not be read. Check the catalogue file before retrying.');}}
 function transact(change,{listings=false}={}){const result=queue.then(async()=>{const current=await load(),next={...change(current),revision:randomUUID(),updatedAt:listings?new Date().toISOString():current.updatedAt||null};if(path){await mkdir(dirname(path),{recursive:true});const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(next),{mode:0o600});await rename(temp,path);}state=next;signature=null;return state;});queue=result.catch(()=>{});return result;}
 return {read:async()=>{await queue;return structuredClone(await load());},ingest:(jobs,now)=>transact(state=>mergeListings(state,jobs,now),{listings:true}),recordRun:(key,run)=>transact(state=>({...state,runs:{...state.runs,[key]:run}}))};
}
export function filterCatalogue(state,params,now=new Date()){
 const query=params.get('what')||'',where=(params.get('where')||'').trim().toLowerCase(),salary=Number(params.get('salary_min'))||0,days=Number(params.get('days'))||0;
 const keywordJobs=state.jobs.map(job=>({...job,availability:availability(job,now),searchScore:keywordMatch(job,query).score})).filter(job=>keywordMatch(job,query).matches);
 const checks={
 employer:job=>!params.get('company')||job.company?.toLowerCase()===params.get('company').toLowerCase(),
 source:job=>!params.get('source')||job.sources.includes(params.get('source')),
 location:job=>!where||job.location?.toLowerCase().includes(where),
 nhs:job=>params.get('nhs')!=='1'||job.sources.includes('NHS Jobs')||[job.title,job.company,job.description].join(' ').toLowerCase().includes('nhs'),
 salary:job=>!salary||Math.max(job.salaryMin||0,job.salaryMax||0)>=salary,
 date:job=>!days||Date.parse(job.created)>=+now-days*86400000,
 contract:job=>!params.get('contract')||job.contract===params.get('contract'),
 closingDate:job=>params.get('includeExpired')==='1'||job.availability!=='expired'
 };
 let jobs=keywordJobs.filter(job=>Object.values(checks).every(check=>check(job)));
 const sort=params.get('sort');jobs.sort(sort==='salary'?(a,b)=>(b.salaryMax||b.salaryMin||0)-(a.salaryMax||a.salaryMin||0):(a,b)=>(sort==='relevance'?b.searchScore-a.searchScore:0)||(Date.parse(b.created)||Date.parse(b.lastSeenAt))-(Date.parse(a.created)||Date.parse(a.lastSeenAt)));
 const total=jobs.length,page=Math.max(1,Math.min(500,parseInt(params.get('page'),10)||1));
 const diagnostics={catalogueTotal:state.jobs.length,keywordTotal:keywordJobs.length,excludedBy:Object.fromEntries(Object.entries(checks).map(([key,check])=>[key,keywordJobs.filter(job=>!check(job)).length]))};
 return {configured:true,jobs:jobs.slice((page-1)*20,page*20),total,page,catalogue:true,query,diagnostics,message:'Search covers collected employer listings, not every UK vacancy. Location uses text matching. Unknown salaries, posting dates and contracts cannot match restrictive filters. Verify availability in the original advert.'};
}
