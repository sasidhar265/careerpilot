import {load} from 'cheerio';
import {plainText,isUkLocation} from './employer-feeds.js';
import {keywordMatch} from './job-search.js';
import {filterCatalogue} from './job-catalogue.js';

export const CAREER_SITES=[
 {id:'cognizant',company:'Cognizant',source:'Cognizant',url:'https://careers.cognizant.com/uki-en/jobs/'},
 {id:'techmahindra',company:'Tech Mahindra',source:'Tech Mahindra',url:'https://careers.techmahindra.com/'},
 {id:'nhs',company:'NHS',source:'NHS Jobs',url:'https://www.jobs.nhs.uk/candidate/search/results'},
 {id:'nttdata',company:'NTT DATA',source:'NTT DATA',url:'https://nttdata.jobs/vacancies/'}
];
const hosts=new Set(CAREER_SITES.map(site=>new URL(site.url).hostname));
const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const date=value=>{if(!value)return '';let input=String(value).trim();if(/^\d{1,2} [A-Za-z]+ \d{4}$/.test(input))input+=' UTC';else if(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(input))input=input.replace(' ','T')+'Z';return Number.isFinite(Date.parse(input))?new Date(input).toISOString():'';};
function job(site,id,title,location,url,extra={}){return {id:site.id+':'+id,title:clean(title),company:site.company,location:clean(location),url,description:'',source:site.source,excerpt:true,created:'',closingDate:'',contract:'',hours:'',salaryMin:null,salaryMax:null,salaryEstimated:false,...extra};}
function safeLink(value,base){try{const url=new URL(value,base);return url.protocol==='https:'&&url.hostname===new URL(base).hostname&&!url.username&&!url.password&&!url.port?url.href:'';}catch{return '';}}
function dom(html){const $=load(html);$('script:not([type="application/ld+json"]),style,noscript').remove();return $;}
function text($,element){return plainText($.html(element));}
function emptyMarker($,pattern){return pattern.test(clean($('main').text()||$('body').text()));}

export function parseNhsResults(html){const site=CAREER_SITES[2],$=dom(html),jobs=[];
 $('[data-test="search-result-job-title"]').each((_,element)=>{const link=$(element),card=link.closest('[data-test="search-result"]'),place=card.find('[data-test="search-result-location"]'),url=safeLink(link.attr('href'),site.url);if(!url||!card.length)return;
 const field=name=>clean(card.find(`[data-test="search-result-${name}"] strong`).text());
 const location=clean(place.find('.location-font-size').text()),company=clean(place.find('h3').clone().children().remove().end().text());
 const salary=field('salary'),amounts=/a year/i.test(salary)?salary.match(/[\d,]+(?:\.\d+)?/g)||[]:[];
 const description=text($,card.find('[data-test="search-result-description"]'));
 jobs.push(job(site,new URL(url).pathname.split('/').pop(),link.text(),location,url,{company:company||'NHS',description,created:date(field('publicationDate')),closingDate:date(field('closingDate')),salaryMin:amounts.length?Number(amounts[0].replaceAll(',','')):null,salaryMax:amounts.length?Number(amounts.at(-1).replaceAll(',','')):null,contract:/permanent/i.test(field('jobType'))?'permanent':/fixed|temporary|contract/i.test(field('jobType'))?'contract':'',hours:/full time/i.test(field('workingPattern'))?'full_time':/part time/i.test(field('workingPattern'))?'part_time':''}));});
 if(!jobs.length&&!emptyMarker($,/no (?:matching )?(?:jobs|results)|0 jobs|did not match|could not find any/i))throw Error('The NHS results page could not be recognised.');
 const next=$('a').filter((_,el)=>/^Next\b/i.test(clean($(el).text()))).first().attr('href');
 return {jobs,next:next?safeLink(next,site.url):''};
}
export function parseNttResults(html){const site=CAREER_SITES[3],$=dom(html),jobs=[];
 $('[data-vacancy-id]').each((_,element)=>{const card=$(element),id=card.attr('data-vacancy-id');if(!/^\d+$/.test(id||''))return;const fields=card.find('.vacancy_list_item'),title=clean(fields.first().text()),location=clean(fields.eq(1).text());if(!title||!isUkLocation(location))return;
 jobs.push(job(site,id,title,location,new URL('/vacancies/'+id+'/',site.url).href));});
 if(!$('[data-vacancy-id]').length&&!emptyMarker($,/no (?:current |matching |available )?(?:vacancies|jobs|results)|no vacancies found|0 vacancies/i))throw Error('The NTT DATA results page could not be recognised.');
 return {jobs,next:''};
}
export function parseTechMahindraResults(html){const site=CAREER_SITES[1],$=dom(html),jobs=[];
 $('[id$="HdnJobCode"]').each((_,element)=>{const input=$(element),card=input.parent(),id=input.val(),title=clean(card.children('div').first().text()),summary=text($,card.find('p').first()),location=clean(summary.match(/Location:\s*([^\n]+)/i)?.[1]);
 if(!id||!title||!isUkLocation(location))return;
 // This portal's detail navigation depends on a server session, not a shareable URL.
 jobs.push(job(site,id,title,location,site.url,{description:summary,portalOnly:true}));});
 if(!$('[id$="HdnJobCode"]').length&&!emptyMarker($,/no (?:matching |current |available )?(?:jobs|records|results)|no jobs found|no record found/i))throw Error('The Tech Mahindra results page could not be recognised.');
 return {jobs,more:$('input[name$="$btnLoadMoreJob"]:not([disabled])').length>0};
}
export function parseCognizantResults(html){const site=CAREER_SITES[0],$=dom(html),jobs=[];
 $('a[href]').each((_,element)=>{const link=$(element),url=safeLink(link.attr('href'),site.url),id=url&&new URL(url).pathname.match(/\/jobs\/([^/]+)\/[^/]+\/?$/)?.[1];if(!id)return;const card=link.closest('li,article,.card,.job-result,.job-list-item'),title=clean(link.find('h2,h3').first().text()||link.text()),location=clean(card.find('[class*="location"], [data-test*="location"]').text()||card.find('li').text()||card.text());if(!title||!isUkLocation(location))return;jobs.push(job(site,id,title,location,url));});
 if(!jobs.length&&!emptyMarker($,/0 matching jobs|no (?:matching |available )?(?:jobs|results)/i))throw Error('The Cognizant results page could not be recognised.');
 return {jobs:[...new Map(jobs.map(item=>[item.id,item])).values()],next:''};
}
function structuredJob($){const entries=[];function visit(value){if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object'){if([value['@type']].flat().includes('JobPosting'))entries.push(value);if(value['@graph'])visit(value['@graph']);}}
 $('script[type="application/ld+json"]').each((_,element)=>{try{visit(JSON.parse($(element).text()));}catch{/* Invalid optional structured data does not replace visible content. */}});return entries[0];}
export function enrichCareerJob(item,html){const $=dom(html),structured=structuredJob($),visible=item.source==='NTT DATA'?$('.vacancy_description'):item.source==='NHS Jobs'?$('#job-description, [data-test="job-description"], .job-description, .wrap-paragraphs').first():$('.job-description,[itemprop="description"]');
 visible.find('.hide-desktop,script,style,button').remove();
 const description=visible.length?text($,visible):plainText(structured?.description);if(!description)return item;
 const amount=structured?.baseSalary,currency=amount?.currency,annual=/^(YEAR|ANNUAL)$/i.test(amount?.value?.unitText||'');
 const work=String(structured?.employmentType||'');
 return {...item,description,excerpt:false,created:date(structured?.datePosted)||item.created,closingDate:date(structured?.validThrough)||item.closingDate,contract:/permanent/i.test(work)?'permanent':/contract|temporary/i.test(work)?'contract':item.contract,hours:/full.?time/i.test(work)?'full_time':/part.?time/i.test(work)?'part_time':item.hours,...(annual&&currency==='GBP'?{salaryMin:Number(amount.value.minValue??amount.value.value)||null,salaryMax:Number(amount.value.maxValue??amount.value.value)||null}:{})};
}

class SiteError extends Error{constructor(message,code='UNAVAILABLE'){super(message);this.code=code;}}
export function createCareerSearch({fetcher=fetch,now=()=>new Date(),timeoutMs=45000,cacheMs=300000}={}){
 const cache=new Map(),pending=new Map();
 async function request(target,deadline,options={},cookies=new Map()){
  let url=new URL(target);for(let redirects=0;redirects<4;redirects++){
   if(url.protocol!=='https:'||!hosts.has(url.hostname)||url.username||url.password||url.port)throw new SiteError('The careers site redirected to an unsupported address.','INVALID_RESPONSE');
   if(Date.now()>=deadline)throw new SiteError('The careers site took too long to respond.','TIMEOUT');
   const response=await fetcher(url,{...options,redirect:'manual',signal:AbortSignal.timeout(Math.max(1,Math.min(12000,deadline-Date.now()))),headers:{Accept:'text/html','User-Agent':'CareerPilotAI/1.0 (public job search)',...(cookies.size?{Cookie:[...cookies].map(([key,value])=>key+'='+value).join('; ')}:{}),...options.headers}});
   for(const cookie of response.headers.getSetCookie?.()||[]){const pair=cookie.split(';')[0],at=pair.indexOf('=');if(at>0)cookies.set(pair.slice(0,at),pair.slice(at+1));}
   if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');if(!location)throw new SiteError('Invalid careers redirect.','INVALID_RESPONSE');const next=new URL(location,url);if(next.hostname!==url.hostname)throw new SiteError('The careers site moved to a different host.','INVALID_RESPONSE');url=next;if(response.status===303||[301,302].includes(response.status)&&options.method==='POST')options={};continue;}
   if(response.status===403)throw new SiteError('This careers site denied automated access (HTTP 403). Open its careers page or retry later.','ACCESS_DENIED');
   if(response.status===429)throw new SiteError('This careers site is rate limiting requests. Please retry later.','RATE_LIMITED');
   if(!response.ok)throw new SiteError('The careers site is unavailable (HTTP '+response.status+').');
   let bytes=0;const chunks=[];for await(const chunk of response.body){bytes+=chunk.length;if(bytes>5000000)throw new SiteError('The careers response exceeded the size limit.','INVALID_RESPONSE');chunks.push(chunk);}return Buffer.concat(chunks).toString('utf8');
  }throw new SiteError('Too many careers redirects.','INVALID_RESPONSE');
 }
 function formBody(html,query,more=false){const $=load(html),body=new URLSearchParams();$('input[type="hidden"][name^="__"]').each((_,el)=>body.set($(el).attr('name'),$(el).val()||''));if(!body.has('__VIEWSTATE'))throw new SiteError('The Tech Mahindra search form changed.','INVALID_RESPONSE');body.set('ctl00$ContentPlaceHolder1$RblList','IT');body.set('ctl00$ContentPlaceHolder1$txtAdvanceSearch',query);body.set('ctl00$ContentPlaceHolder1$'+(more?'btnLoadMoreJob':'btnFreeSearch'),more?'More Jobs':'Search');return body.toString();}
 async function collect(site,query,where,deadline){let jobs=[],note='',detailFailures=0;
  if(site.id==='techmahindra'){
   const cookies=new Map(),initial=await request(site.url,deadline,{},cookies);let html=await request(site.url,deadline,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:formBody(initial,query)},cookies);
   for(let page=0;page<3;page++){const parsed=parseTechMahindraResults(html);jobs.push(...parsed.jobs);if(!parsed.more)break;if(page===2){note='Checked up to 36 global result cards; only identifiable UK locations are included. Refine your keywords for wider coverage.';break;}try{html=await request(site.url,deadline,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:formBody(html,query,true)},cookies);}catch{note='Later result pages could not be read; only the earlier result cards are included.';break;}}
   note=(note?note+' ':'')+'Tech Mahindra provides result summaries; open its portal and search the job reference for details.';
  }else{
   const url=new URL(site.url);if(site.id==='nhs'){url.searchParams.set('keyword',query);url.searchParams.set('language','en');if(where)url.searchParams.set('location',where);}
   if(site.id==='nttdata')url.searchParams.set('all',query);
   if(site.id==='cognizant'){url.searchParams.set('keyword',query);url.searchParams.set('location','United Kingdom');url.searchParams.set('cname','United Kingdom');url.searchParams.set('ccode','GB');}
   const parser=site.id==='nhs'?parseNhsResults:site.id==='nttdata'?parseNttResults:parseCognizantResults;
   let target=url.href;for(let page=0;page<3;page++){let parsed;try{parsed=parser(await request(target,deadline));}catch(error){if(!page)throw error;note='Later result pages could not be read; earlier listings are retained.';break;}jobs.push(...parsed.jobs);if(!parsed.next)break;if(page===2){note='Checked the first 30 NHS search results. Refine keywords and location to narrow the search.';break;}target=parsed.next;}
   const unique=[...new Map(jobs.map(item=>[item.id,item])).values()];jobs=unique.sort((a,b)=>keywordMatch(b,query).score-keywordMatch(a,query).score);
   let cursor=0;await Promise.all(Array.from({length:2},async()=>{while(cursor<Math.min(8,jobs.length)&&Date.now()+1500<deadline){const index=cursor++;try{jobs[index]=enrichCareerJob(jobs[index],await request(jobs[index].url,deadline));}catch{detailFailures++;}}}));
   if(jobs.some(item=>item.excerpt))note=(note?note+' ':'')+'Some listings contain search summaries only; verify the full advert before tailoring.';
   if(detailFailures)note+=' '+detailFailures+' detail pages could not be read.';
  }
  return {jobs:[...new Map(jobs.map(item=>[item.id,item])).values()],note};
 }
 async function run(query,where,source){const deadline=Date.now()+timeoutMs,checkedAt=now().toISOString(),selected=CAREER_SITES.filter(site=>!source||site.source===source),jobs=[],sourceStatuses=[];
  await Promise.all(selected.map(async site=>{try{const batch=await collect(site,query,where,deadline);jobs.push(...batch.jobs);sourceStatuses.push({id:site.id,company:site.company,source:site.source,careersUrl:site.url,status:batch.note?'partial':'ok',count:batch.jobs.length,checkedAt,note:batch.note,error:''});}catch(error){sourceStatuses.push({id:site.id,company:site.company,source:site.source,careersUrl:site.url,status:'error',count:0,checkedAt,note:'',code:error.code||'UNAVAILABLE',error:error instanceof SiteError?error.message:'The careers results could not be read. The site may have changed or timed out. Open the careers page to check.'});}}));
  return {jobs,sourceStatuses:sourceStatuses.sort((a,b)=>CAREER_SITES.findIndex(site=>site.id===a.id)-CAREER_SITES.findIndex(site=>site.id===b.id)),checkedAt};
 }
 return {async search(params){const query=(params.get('what')||params.get('q')||'').trim(),where=(params.get('where')||params.get('location')||'').trim(),source=params.get('source')||'';
  if(query.length>200||where.length>200||query.split(/\s+/).length>20||source&&!CAREER_SITES.some(site=>site.source===source))throw Object.assign(Error('Use valid career-site filters and at most 20 search words.'),{status:400});
  if(!query)return {configured:true,careerSites:true,jobs:[],total:0,page:1,sourceStatuses:CAREER_SITES.map(site=>({id:site.id,company:site.company,source:site.source,careersUrl:site.url,status:'idle',count:0,error:'',note:''})),message:'Enter a job title or keywords to search Cognizant, Tech Mahindra, NHS and NTT DATA.'};
  const key=JSON.stringify([query.toLowerCase(),where.toLowerCase(),source]);let entry=cache.get(key),cached=Boolean(entry&&entry.expires>Date.now());
  if(!cached){if(!pending.has(key)){if(pending.size>=6)throw Object.assign(Error('Career-site searches are busy. Please retry shortly.'),{status:429});const work=run(query,where,source).then(value=>{cache.set(key,{value,expires:Date.now()+(value.sourceStatuses.every(site=>site.status==='error')?30000:cacheMs)});while(cache.size>40)cache.delete(cache.keys().next().value);return value;}).finally(()=>pending.delete(key));pending.set(key,work);}entry={value:await pending.get(key)};}
  const value=entry.value,records=value.jobs.map(item=>({...item,aliases:[item.source+':'+item.id],sources:[item.source],catalogueId:item.source+':'+item.id,lastSeenAt:value.checkedAt,firstSeenAt:value.checkedAt}));
  const localParams=new URLSearchParams(params);localParams.set('what',query);localParams.delete('where'); // NHS postcode radius and employer location labels differ; explicit text filtering is applied below for other sites.
  const filtered=records.filter(item=>item.source==='NHS Jobs'||!where||item.location.toLowerCase().includes(where.toLowerCase()));
  const result=filterCatalogue({jobs:filtered},localParams,now());
  return {...result,catalogue:false,careerSites:true,sourceStatuses:value.sourceStatuses,checkedAt:value.checkedAt,cached,message:(value.sourceStatuses.every(site=>site.status==='error')?'The selected career sites could not be reached. See source errors below. ':'')+'Results come directly from the selected career sites and cover a bounded set of listings. '+(cached?'Reusing results checked within the last five minutes. ':'')+'A source error does not mean it has no vacancies.'};
 }};
}
