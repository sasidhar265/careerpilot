import {DOMParser} from '@xmldom/xmldom';
import {safeJobUrl} from './jobs.js';
function strip(value){return value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,50000);}
export function parseNhsFeed(xml){
 if(typeof xml!=='string'||Buffer.byteLength(xml)>5000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid NHS feed.');
 const doc=new DOMParser({errorHandler:{warning:()=>{throw Error('Invalid NHS XML.');},error:()=>{throw Error('Invalid NHS XML.');},fatalError:()=>{throw Error('Invalid NHS XML.');}}}).parseFromString(xml,'application/xml');
 const root=doc.documentElement?.localName?.toLowerCase();if(!['rss','feed','jobs','vacancies','searchresults','search_results'].includes(root))throw Error('Unrecognized NHS feed format. Use the official XML/RSS feed URL.');
 const nodes=Array.from(doc.getElementsByTagName('*')).filter(node=>['item','entry','job','vacancy'].includes(node.localName.toLowerCase()));
 return nodes.slice(0,5000).flatMap(node=>{
 const get=(...names)=>{const found=Array.from(node.getElementsByTagName('*')).find(n=>names.includes(n.localName.toLowerCase()));return found?.textContent?.trim()||'';};
 const atomLink=Array.from(node.getElementsByTagName('link')).find(n=>n.getAttribute('href')&&(!n.getAttribute('rel')||n.getAttribute('rel')==='alternate'));
 const url=safeJobUrl(atomLink?.getAttribute('href')||get('link','url','job_url','advert_url'));
 if(!url||!['www.jobs.nhs.uk','jobs.nhs.uk'].includes(new URL(url).hostname))return [];
 const title=strip(get('title','job_title','jobtitle'));if(!title)return [];
 const date=get('closingdate','closing_date','validthrough'),parsed=Date.parse(date);
 return [{id:get('guid','id','reference','job_reference')||url,title,company:strip(get('employer','employer_name','company','author')),location:strip(get('location','job_location')),description:strip(get('encoded','description','summary','content')),url,created:get('pubdate','published','date_posted','dateposted'),closingDate:Number.isFinite(parsed)?new Date(parsed).toISOString():'',salaryMin:null,salaryMax:null,salaryEstimated:false,contract:strip(get('contract_type','contract')),hours:'',source:'NHS Jobs',excerpt:true}];
 });
}
export async function fetchNhsFeed(url,{fetcher=fetch}={}){
 const parsed=new URL(url);if(parsed.protocol!=='https:'||!['www.jobs.nhs.uk','jobs.nhs.uk'].includes(parsed.hostname)||parsed.username||parsed.password||parsed.port)throw Error('NHS feed URL must use https://www.jobs.nhs.uk.');
 const response=await fetcher(parsed,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{Accept:'application/rss+xml, application/xml, text/xml'}});
 if(!response.ok)throw Error('NHS feed is unavailable.');
 const chunks=[];let bytes=0;for await(const chunk of response.body){bytes+=chunk.length;if(bytes>5000000)throw Error('NHS feed exceeds the size limit.');chunks.push(chunk);}
 return parseNhsFeed(Buffer.concat(chunks).toString('utf8'));
}
