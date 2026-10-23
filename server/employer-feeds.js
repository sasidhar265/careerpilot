import {setTimeout as pause} from 'node:timers/promises';
import {safeJobUrl} from './jobs.js';
import {UK_EMPLOYERS} from './uk-employers.js';
export const DEFAULT_BOARDS=UK_EMPLOYERS;
export function employerBoards(value){
 const boards=value?JSON.parse(value):DEFAULT_BOARDS;
 if(!Array.isArray(boards)||boards.length>200)throw Error('JOB_EMPLOYER_BOARDS must be an array of up to 200 boards.');
 const seen=new Set();return boards.map(item=>{
 if(!item||!['greenhouse','lever','ashby','smartrecruiters'].includes(item.provider)||typeof item.board!=='string'||!/^[a-z0-9_-]{1,100}$/i.test(item.board)||item.region&&!['global','eu'].includes(item.region))throw Error('Invalid employer board. Use provider, board slug, optional company and global/eu region.');
 return {careersUrl:typeof item.careersUrl==='string'?safeJobUrl(item.careersUrl):'',provider:item.provider,board:item.board,company:typeof item.company==='string'?item.company.slice(0,200):item.board,region:item.region==='eu'?'eu':'global'};
 }).filter(item=>{const key=[item.provider,item.board,item.region].join(':');if(seen.has(key))return false;seen.add(key);return true;});
}
export function plainText(value){
 let text=typeof value==='string'?value.slice(0,200000):'';
 for(let i=0;i<2;i++)text=text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi,entity=>{const values={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};if(values[entity.toLowerCase()])return values[entity.toLowerCase()];const number=entity[2]?.toLowerCase()==='x'?parseInt(entity.slice(3,-1),16):parseInt(entity.slice(2,-1),10);return Number.isFinite(number)&&number>0&&number<=0x10ffff?String.fromCodePoint(number):'';});
 return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<\s*(?:br\s*\/?|\/p|\/div|\/li|\/h[1-6])\s*>/gi,'\n').replace(/<[^>]*>/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n/g,'\n\n').trim().slice(0,50000);
}
export function isUkLocation(value,country=''){
 if(country&&['GB','GBR','UK','UNITED KINGDOM'].includes(country.toUpperCase()))return true;
 if(country&&!['GB','GBR','UK','UNITED KINGDOM'].includes(country.toUpperCase()))return false;
 return /\b(united kingdom|uk|great britain|england|scotland|wales|northern ireland|london|manchester|birmingham|leeds|bristol|edinburgh|glasgow|belfast|cardiff|nottingham|sheffield|newcastle|cambridge|oxford|brighton|reading|southampton|liverpool|york|bath|exeter)\b/i.test(value||'')&&!/\b(new york|massachusetts|ontario|canada|kentucky|new hampshire|pennsylvania|connecticut|united states|\busa\b)\b/i.test(value||'');
}
function employment(value){const text=(value||'').toLowerCase();return {contract:/contract|temporary|freelance/.test(text)?'contract':/permanent/.test(text)?'permanent':'',hours:/full.?time/.test(text)?'full_time':/part.?time/.test(text)?'part_time':''};}
export function normalizeEmployerJobs(config,data){
 const rows=config.provider==='lever'?data:config.provider==='smartrecruiters'?data?.content:data?.jobs;if(!Array.isArray(rows))throw Error('Invalid employer board response.');
 return rows.flatMap(item=>{
 let title,url,id,description,locations=[],created='',updatedAt='',workplace='',pay=null,work='';
 if(config.provider==='greenhouse'){if(item.internal_job_id===null)return [];title=item.title;url=item.absolute_url;id=item.id;description=plainText(item.content);locations=[item.location?.name,...(item.offices||[]).map(office=>office.location)].filter(Boolean);updatedAt=item.updated_at||'';}
 if(config.provider==='lever'){title=item.text;url=item.hostedUrl;id=item.id;description=[item.descriptionPlain||plainText(item.description),...(item.lists||[]).map(list=>plainText(list.text)+'\n'+plainText(list.content)),item.additionalPlain||plainText(item.additional)].filter(Boolean).join('\n\n');locations=[item.categories?.location,...(item.categories?.allLocations||[])].filter(Boolean);work=item.categories?.commitment||'';workplace=item.workplaceType||'';pay=item.salaryRange;created=Number.isFinite(item.createdAt)?new Date(item.createdAt).toISOString():'';}
 if(config.provider==='ashby'){if(item.isListed!==true)return [];title=item.title;url=item.jobUrl;id=item.id||url;description=item.descriptionPlain||plainText(item.descriptionHtml);locations=[item.location,...(item.secondaryLocations||[]).map(location=>location.location)].filter(Boolean);const country=item.address?.postalAddress?.addressCountry;const secondary=(item.secondaryLocations||[]).some(location=>isUkLocation(location.location,location.address?.addressCountry));if(!isUkLocation(item.location,country)&&!secondary)return [];work=item.employmentType||'';workplace=item.workplaceType||'';created=item.publishedAt||'';pay=item.compensation?.summaryComponents?.find(part=>part.compensationType==='Salary'&&part.currencyCode==='GBP');}
 if(config.provider==='smartrecruiters'){
 if(!isUkLocation(item.location?.city,item.location?.country))return [];
 title=item.name;id=item.id;url=item.postingUrl||`https://jobs.smartrecruiters.com/${encodeURIComponent(config.board)}/${encodeURIComponent(String(item.id))}`;
 locations=[[item.location?.city,item.location?.region,item.location?.country].filter(Boolean).join(', ')];created=item.releasedDate||'';work=item.typeOfEmployment?.label||'';workplace=item.location?.remote?'Remote':'';
 description=Object.values(item.jobAd?.sections||{}).map(section=>[section.title,plainText(section.text)].filter(Boolean).join('\n')).join('\n\n');
 }
 const location=locations.join(' · ');if(!['ashby','smartrecruiters'].includes(config.provider)&&!locations.some(location=>isUkLocation(location)))return [];
 url=safeJobUrl(url);if(!id||typeof title!=='string'||!title.trim()||!url)return [];
 const yearly=pay&&/^(year|yearly|annual|1 YEAR)$/i.test(pay.interval||''),gbp=pay?.currency==='GBP'||pay?.currencyCode==='GBP';
 return [{id:config.board+':'+String(id),title:plainText(title),company:config.company,location,description:description.slice(0,50000),url,created,updatedAt,source:{greenhouse:'Greenhouse',lever:'Lever',ashby:'Ashby',smartrecruiters:'SmartRecruiters'}[config.provider],excerpt:!description,workplace,salaryMin:yearly&&gbp?(Number(pay.min??pay.minValue)||null):null,salaryMax:yearly&&gbp?(Number(pay.max??pay.maxValue)||null):null,salaryEstimated:false,...employment(work)}];
 });
}
export async function fetchEmployerBoard(config,{fetcher=fetch,deadline=Date.now()+90000}={}){
 if(config.provider==='smartrecruiters')return fetchSmartRecruiters(config,{fetcher,deadline});
 const slug=encodeURIComponent(config.board),url=config.provider==='greenhouse'?`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`:config.provider==='lever'?`https://api${config.region==='eu'?'.eu':''}.lever.co/v0/postings/${slug}?mode=json&limit=100&skip=0`:`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;
 const rows=[];for(let page=0;page<(config.provider==='lever'?5:1);page++){
 if(Date.now()>=deadline)throw Error('Employer collection time budget reached.');
 const target=new URL(url);if(config.provider==='lever')target.searchParams.set('skip',String(page*100));
 const response=await fetcher(target,{signal:AbortSignal.timeout(Math.max(1,Math.min(15000,deadline-Date.now()))),redirect:'error',headers:{Accept:'application/json'}});if(!response.ok)throw Error('Employer board unavailable.');
 let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>10000000)throw Error('Employer board exceeds size limit.');chunks.push(chunk);}
 const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));rows.push(...normalizeEmployerJobs(config,data));if(config.provider!=='lever'||data.length<100)break;
 }
 return rows;
}

let smartNextRequestAt=0,smartBlockedUntil=0;
async function feedJson(url,{fetcher,deadline}){
 const requestAt=Math.max(Date.now(),smartNextRequestAt,smartBlockedUntil);smartNextRequestAt=requestAt+150;
 if(requestAt>=deadline)throw Error('Collection time budget reached.');
 if(requestAt>Date.now())await pause(requestAt-Date.now());
 if(Date.now()<smartBlockedUntil)throw Error('SmartRecruiters is temporarily rate limited.');
 if(Date.now()>=deadline)throw Error('Collection time budget reached.');
 const response=await fetcher(url,{signal:AbortSignal.timeout(Math.max(1,Math.min(15000,deadline-Date.now()))),redirect:'error',headers:{Accept:'application/json'}});
 if(response.status===429){const retry=Number(response.headers.get('retry-after'));smartBlockedUntil=Date.now()+(Number.isFinite(retry)&&retry>0?retry:60)*1000;throw Error('Employer board is rate limited.');}
 if(!response.ok)throw Error('Employer board unavailable.');let size=0;const parts=[];for await(const chunk of response.body){size+=chunk.length;if(size>10000000)throw Error('Employer response exceeds size limit.');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
async function fetchSmartRecruiters(config,options){
 const base=`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(config.board)}/postings`,postings=[];
 for(let page=0;page<5;page++){
 const data=await feedJson(new URL(base+`?destination=PUBLIC&country=gb&limit=100&offset=${page*100}`),options);
 if(!Array.isArray(data.content))throw Error('Invalid SmartRecruiters response.');postings.push(...data.content);
 if(data.content.length<100||(page+1)*100>=data.totalFound)break;
 }
 // Details are bounded; summaries remain searchable and explicitly marked as excerpts.
 const uk=postings.filter(item=>isUkLocation(item.location?.city,item.location?.country));
 let detailFailures=0;
 for(let index=0;index<Math.min(30,uk.length);index++){
 try{const detail=await feedJson(new URL(base+'/'+encodeURIComponent(String(uk[index].id))),options);uk[index]={...uk[index],...detail};}catch{detailFailures++;}
 }
 const jobs=normalizeEmployerJobs(config,{content:uk});
 if(uk.length>30||postings.length>=500||detailFailures)jobs.collectionNote=`Up to 500 postings per board; full descriptions checked for the first 30 UK postings. ${detailFailures} detail requests failed; summaries retained.`;
 return jobs;
}
