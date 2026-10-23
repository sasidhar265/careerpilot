import {createEmployerDirectory} from './employer-directory.js';
import {EXTERNAL_EMPLOYERS,UK_EMPLOYERS,boardKey,careerBoardUrl} from './uk-employers.js';
import {employerBoards,fetchEmployerBoard} from './employer-feeds.js';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
// Runtime filesystem paths are not browser/build assets.
function dataFile(filename){return resolve(dirname(fileURLToPath(import.meta.url)),'../.data',filename);}
import {createCatalogue,filterCatalogue,availability} from './job-catalogue.js';
import {fetchNhsFeed} from './nhs-feed.js';
export function activeCatalogue(state){
 return {...state,jobs:state.jobs.filter(job=>job.source!=='Adzuna').map(job=>({...job,sources:job.sources.filter(source=>source!=='Adzuna'),aliases:job.aliases.filter(alias=>!alias.startsWith('Adzuna:'))})),runs:Object.fromEntries(Object.entries(state.runs).filter(([key])=>!key.startsWith('adzuna-')))};
}
export function createJobService(options={}){
 const env=options.env||process.env,fetcher=options.fetcher||fetch,now=options.now||(()=>new Date()),catalogue=options.catalogue||createCatalogue({path:options.storePath===null?null:options.storePath||dataFile('jobs.json')});
 const directory=options.directory||createEmployerDirectory({path:options.directoryPath===null||options.storePath===null?null:options.directoryPath||dataFile('employers.json')});
 let inflight=null,refreshAgain=false,lastRefresh=0,timer=null,configurationError='',rotation=0,progress={completed:0,total:0};
 let configured=[];
 try{configured=employerBoards(env.JOB_EMPLOYER_BOARDS);}catch{configurationError='JOB_EMPLOYER_BOARDS must be a valid JSON array of supported employer boards.';}
 async function getSources(){const custom=await directory.read();const boards=[...new Map([...configured,...custom].map(board=>[boardKey(board),board])).values()];const sources=boards.map(board=>({key:boardKey(board),label:board.company+' · '+board.provider,type:board.provider,careersUrl:careerBoardUrl(board),board}));if(env.NHS_JOBS_FEED_URL)sources.push({key:'nhs-feed',label:'NHS Jobs feed',type:'nhs'});return sources;}
 const intervalMinutes=Math.max(15,Math.min(1440,Number(env.JOB_REFRESH_MINUTES)||60)),automatic=env.JOB_AUTO_REFRESH!=='false';
 async function status(){const sources=await getSources(),state=activeCatalogue(await catalogue.read()),time=now();return {catalogueRevision:state.revision||'empty',catalogueUpdatedAt:state.updatedAt||null,sources:sources.map(({key,label,type,careersUrl})=>({key,label,type,careersUrl,...state.runs[key]})),configurationError,nhsConfigured:Boolean(env.NHS_JOBS_FEED_URL),automatic,intervalMinutes,refreshing:Boolean(inflight),progress,counts:{total:state.jobs.length,recent:state.jobs.filter(j=>availability(j,time)==='recent').length,stale:state.jobs.filter(j=>availability(j,time)==='stale').length,expired:state.jobs.filter(j=>availability(j,time)==='expired').length}};}
 async function employers(){const sources=await getSources(),state=activeCatalogue(await catalogue.read()),custom=await directory.read();const rows=new Map();
 for(const board of [...UK_EMPLOYERS,...custom,...sources.filter(source=>source.board).map(source=>source.board)]){const key=boardKey(board),source=sources.find(source=>source.key===key),run=state.runs[key]||{};rows.set(key,{key,company:board.company,provider:board.provider,careersUrl:careerBoardUrl(board),connected:Boolean(source),...run,jobs:state.jobs.filter(job=>job.source===({greenhouse:'Greenhouse',lever:'Lever',ashby:'Ashby',smartrecruiters:'SmartRecruiters'}[board.provider])&&job.id.startsWith(board.board+':')&&availability(job,now())!=='expired').length});}
 return {employers:[...rows.values(),...EXTERNAL_EMPLOYERS.map(board=>({...board,key:'external:'+board.company,connected:false,jobs:0}))],exhaustive:false};
 }
 async function collect(){const sources=await getSources(),deadline=Date.now()+(options.refreshBudgetMs??90000),total=sources.length;progress={completed:0,total};let cursor=0;
 const ordered=sources.slice(rotation).concat(sources.slice(0,rotation));
 async function worker(){while(cursor<total&&Date.now()<deadline){const index=cursor++,source=ordered[index],startedAt=now().toISOString();
 try{const jobs=source.type==='nhs'?await fetchNhsFeed(env.NHS_JOBS_FEED_URL,{fetcher}):await fetchEmployerBoard(source.board,{fetcher,deadline});
 await catalogue.ingest(jobs,startedAt);await catalogue.recordRun(source.key,{lastAttemptAt:startedAt,lastSuccessAt:startedAt,count:jobs.length,error:'',warning:jobs.collectionNote||''});
 }catch{const previous=(activeCatalogue(await catalogue.read())).runs[source.key]||{};await catalogue.recordRun(source.key,{...previous,lastAttemptAt:startedAt,error:'Refresh failed. Existing listings have been retained. Check source configuration or retry later.'});}
 progress={completed:progress.completed+1,total};
 }}
 await Promise.all(Array.from({length:Math.min(3,total)},()=>worker()));rotation=total?(rotation+cursor)%total:0;
 }
 async function refresh(){if(inflight){await inflight;return status();}if(lastRefresh&&+now()-lastRefresh<60000)return status();lastRefresh=+now();inflight=(async()=>{do{refreshAgain=false;await collect();}while(refreshAgain);})();try{await inflight;}finally{inflight=null;}return status();}
 return {
 status,refresh,employers,
 addEmployer:async input=>{const employer=await directory.add(input);lastRefresh=0;if(inflight)refreshAgain=true;return employer;},
 browse:async params=>{const state=activeCatalogue(await catalogue.read());return {...filterCatalogue(state,params,now()),catalogueRevision:state.revision||'empty',catalogueUpdatedAt:state.updatedAt||null};},
 lookup:async aliases=>{const wanted=new Set(aliases),state=activeCatalogue(await catalogue.read());return state.jobs.filter(job=>job.aliases.some(alias=>wanted.has(alias))).map(job=>({...job,availability:availability(job,now())}));},
 start(){if(timer||!automatic)return;refresh().catch(()=>{});timer=setInterval(()=>refresh().catch(()=>{}),intervalMinutes*60000);timer.unref?.();},
 stop(){if(timer)clearInterval(timer);timer=null;}
 };
}
