import {createJobService} from './job-service.js';
import {ApiError} from './ai.js';
import {runProvider} from './providers.js';
import {getProviderStatuses} from './availability.js';
export function createApiHandler(options={}){const jobs=options.jobsService||createJobService(options.jobs);const handler=async(req,res)=>{
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/api/jobs')){
 const origin=req.headers.origin;if(origin){try{const url=new URL(origin);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.host!==req.headers.host)throw Error();}catch{return send(403,{error:'Request origin is not allowed.'});}}
 try{
 const params=new URL(req.url,'http://localhost').searchParams;
 if(req.method==='GET'&&pathname==='/api/jobs')return send(200,await jobs.browse(params));
 if(req.method==='GET'&&pathname==='/api/jobs/careers')return send(200,await jobs.searchCareers(params));
 if(req.method==='GET'&&pathname==='/api/jobs/catalogue')return send(200,await jobs.browse(params));
 if(req.method==='GET'&&pathname==='/api/jobs/employers')return send(200,await jobs.employers());
 if(req.method==='POST'&&pathname==='/api/jobs/employers'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>5000)return send(413,{error:'Employer request is too large.'});}let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid employer request.'});}if(!body||typeof body!=='object')return send(400,{error:'Invalid employer request.'});return send(201,{employer:await jobs.addEmployer(body)});}
 if(req.method==='GET'&&pathname==='/api/jobs/sources')return send(200,await jobs.status());
 if(req.method==='POST'&&pathname==='/api/jobs/refresh')return send(200,await jobs.refresh());
 if(req.method==='POST'&&pathname==='/api/jobs/lookup'){
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>100000)return send(413,{error:'Too many job references.'});}
 let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid request.'});}
 if(!Array.isArray(body?.aliases)||body.aliases.length>500||body.aliases.some(alias=>typeof alias!=='string'||alias.length>2200))return send(400,{error:'Invalid job references.'});
 return send(200,{jobs:await jobs.lookup(body.aliases)});
 }
 return send(404,{error:'Endpoint not found.'});
 }catch(e){return send(e.status||503,{error:e.status?e.message:'The local job catalogue is unavailable. Check its file permissions and source configuration.'});}
 }
 if(req.method==='GET'&&req.url?.startsWith('/api/providers')){try{return send(200,{providers:await getProviderStatuses({refresh:req.url.includes('refresh=1'),copilotModel:new URL(req.url,'http://localhost').searchParams.get('copilotModel')||undefined})});}catch{return send(503,{error:'Unable to check AI providers.'});}}
 if(req.method==='GET'&&req.url==='/api/health')return send(200,{provider:['codex','copilot'].includes(process.env.AI_PROVIDER)?process.env.AI_PROVIDER:'openai',configured:Boolean(options.apiKey??process.env.OPENAI_API_KEY),model:options.model||process.env.OPENAI_MODEL||'gpt-4.1'});
 const match=req.url?.match(/^\/api\/ai\/(job|compare|rewrite|screen|supporting)$/);
 if(req.method!=='POST'||!match)return send(404,{error:'Endpoint not found.'});
 // Local-only server: reject cross-origin browser calls to protect the API key's usage.
 const origin=req.headers.origin;if(origin){try{const url=new URL(origin);if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.host!==req.headers.host)throw new Error();}catch{return send(403,{error:'Request origin is not allowed.'});}}
 if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'Expected a JSON request.'});
 try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>250000)throw new ApiError(413,'Document request is too large.');}let body;try{body=JSON.parse(raw);}catch{throw new ApiError(400,'Invalid JSON request.');}if(!body||typeof body!=='object')throw new ApiError(400,'Invalid request.');send(200,await runProvider(match[1],body,options));}catch(e){send(e.status||500,{error:e.status?e.message:'An unexpected error occurred. Please retry.'});}
 };return {handler,jobs};}
