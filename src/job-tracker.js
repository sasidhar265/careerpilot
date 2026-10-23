export const TRACKER_KEY='align-job-tracker-v1';
export const STATUSES=['Saved','Applied','Interview','Offer','Rejected','Withdrawn'];
const fields=['title','company','location','description','url','source','created','contract','hours'];
export function jobKey(job){return `${job.source||'Manual'}:${job.id}`;}
export function safeLink(value){try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export function cleanJob(job){
 if(!job||typeof job!=='object'||typeof job.id!=='string'||!job.id||typeof job.title!=='string'||!job.title.trim())return null;
 const result={id:job.id.slice(0,2000)};for(const key of fields)result[key]=typeof job[key]==='string'?job[key].slice(0,key==='description'?50000:2000):'';
 result.url=safeLink(result.url);result.source=result.source||'Manual';result.excerpt=job.excerpt!==false;return result;
}
export function readTracker(storage){
 const raw=storage.getItem(TRACKER_KEY);if(!raw)return [];
 const parsed=JSON.parse(raw);if(!Array.isArray(parsed))throw new Error('Invalid saved tracker');
 return [...new Map(parsed.flatMap(record=>{const job=cleanJob(record?.job);if(!job)return [];return [[jobKey(job),{job,saved:record.saved===true,hidden:record.hidden===true,status:STATUSES.includes(record.status)?record.status:'Saved',notes:typeof record.notes==='string'?record.notes.slice(0,10000):'',deadline:validDate(record.deadline),appliedAt:validDate(record.appliedAt),updatedAt:typeof record.updatedAt==='string'?record.updatedAt:''}]];})).values()];
}
export function validDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value))?value:'';}
export function changeTrackedJob(records,job,patch,now=new Date().toISOString()){
 const clean=cleanJob(job);if(!clean)return records;
 const key=jobKey(clean),existing=records.find(record=>jobKey(record.job)===key);
 const next={job:clean,saved:false,hidden:false,status:'Saved',notes:'',deadline:'',appliedAt:'',...existing,updatedAt:now};
 if(typeof patch.saved==='boolean')next.saved=patch.saved;
 if(typeof patch.hidden==='boolean')next.hidden=patch.hidden;
 if(STATUSES.includes(patch.status)){next.status=patch.status;next.saved=true;if(patch.status==='Applied'&&!next.appliedAt)next.appliedAt=now.slice(0,10);}
 if(typeof patch.notes==='string')next.notes=patch.notes.slice(0,10000);
 for(const key of ['deadline','appliedAt'])if(key in patch)next[key]=validDate(patch[key]);
 return existing?records.map(record=>jobKey(record.job)===key?next:record):[next,...records];
}
