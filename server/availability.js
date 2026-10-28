import {availableCopilotModels} from '../src/copilot-models.js';
import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {startRpc} from './rpc.js';
const exec=promisify(execFile),cache=new Map();
const labels={openai:'OpenAI API',codex:'Codex CLI',copilot:'GitHub Copilot'};
const finiteNumber=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
export function normalizeCopilotQuota(data){
 const snapshots=data?.quotaSnapshots||data?.quota_snapshots||{};
 return Object.entries(snapshots).filter(([,q])=>q&&typeof q==='object').map(([key,q])=>{
 const name=key.replace(/([a-z])([A-Z])/g,'$1_$2').toLowerCase();
 const limit=finiteNumber(q.entitlementRequests)??finiteNumber(q.entitlement);
 const remaining=finiteNumber(q.quota_remaining)??finiteNumber(q.remaining);
 const suppliedUsed=finiteNumber(q.usedRequests);
 const used=suppliedUsed??(limit!==null&&limit>=0&&remaining!==null&&remaining>=0&&remaining<=limit?limit-remaining:null);
 const suppliedPercent=finiteNumber(q.remainingPercentage)??finiteNumber(q.percent_remaining);
 const remainingPercent=suppliedPercent??(limit>0&&remaining!==null?Math.max(0,Math.min(100,100*remaining/limit)):null);
 const resetSeconds=finiteNumber(q.quota_reset_at);
 const resetAt=(typeof q.resetDate==='string'?q.resetDate:null)||(typeof data.quota_reset_date_utc==='string'?data.quota_reset_date_utc:null)||(resetSeconds!==null&&Number.isFinite(new Date(resetSeconds*1000).getTime())?new Date(resetSeconds*1000).toISOString():null);
 return {name,used,limit,remaining,remainingPercent,resetAt,
 unlimited:q.isUnlimitedEntitlement===true||q.unlimited===true||limit===-1,
 hasQuota:typeof q.has_quota==='boolean'?q.has_quota:null,
 tokenBasedBilling:q.token_based_billing===true,
 usageAllowedWithExhaustedQuota:typeof q.usageAllowedWithExhaustedQuota==='boolean'?q.usageAllowedWithExhaustedQuota:q.has_quota===false?false:null,
 overageAllowedWithExhaustedQuota:typeof q.overageAllowedWithExhaustedQuota==='boolean'?q.overageAllowedWithExhaustedQuota:typeof q.overage_permitted==='boolean'?q.overage_permitted:null,
 };
 });
}
// Whitelist quota fields only: never expose the authInfo object or its tokens.
export async function readCopilotQuota(rpc,options={}){
 const primary=await rpc.request('account.getQuota',{});
 const quota=normalizeCopilotQuota(primary);
 if(copilotAllowance(quota,options).verified)return {quota,source:'account.getQuota'};
 try{
 const current=await rpc.request('account.getCurrentAuth',{});
 const user=current?.authInfo?.copilotUser;
 const fallback=normalizeCopilotQuota(user);
 if(fallback.length){
 const combined=new Map(quota.map(q=>[q.name,q]));
 // The raw subscription snapshot has balances omitted by some CLI adapters.
 for(const row of fallback){const previous=combined.get(row.name);if(!previous||row.remaining!==null||row.hasQuota!==null||row.unlimited||row.limit>0)combined.set(row.name,row);}
 return {quota:[...combined.values()],source:'Copilot subscription snapshot'};
 }
 }catch{}
 return {quota,source:'account.getQuota'};
}
export function copilotAllowance(quota,{model,models=[]}={}){
 const unknown=reason=>({verified:false,blocked:false,continuedUsage:false,reason});
 // A model explicitly priced at zero premium requests without token pricing does
 // not consume the premium bucket. Never guess the price from its model name.
 if(model?.billing?.multiplier===0&&!model.billing.tokenPrices)return {verified:true,blocked:false,continuedUsage:false,noMeteredQuota:true};
 // Zero-entitlement buckets are often inactive placeholders. Chat/completion
 // quotas do not establish whether CLI model inference can run.
 const relevant=quota.filter(q=>(['ai_credits','premium_interactions'].includes(q.name)||q.tokenBasedBilling===true)&&
 (q.unlimited||q.limit>0||q.remaining>0||q.hasQuota===true||q.usageAllowedWithExhaustedQuota===true||q.overageAllowedWithExhaustedQuota===true||(q.limit===null&&q.remainingPercent>0)));
 if(!relevant.length)return unknown('No active CLI inference allowance was supplied; quota availability is unknown.');
 const states=relevant.map(q=>{
 if(q.unlimited)return {verified:true,blocked:false,continuedUsage:false};
 if(q.resetAt&&Number.isFinite(Date.parse(q.resetAt))&&Date.parse(q.resetAt)<=Date.now())return unknown('Copilot returned a quota snapshot whose reset time has passed. Refresh to verify the current allowance.');
 const remaining=q.remaining??(q.limit>0&&q.used!==null&&q.used>=0?Math.max(0,q.limit-q.used):null);
 const percentage=q.remainingPercent!==null&&q.remainingPercent>=0&&q.remainingPercent<=100?q.remainingPercent:null;
 if((remaining>0&&percentage===0)||(remaining===0&&percentage>0))return unknown('Copilot quota counts and percentages disagree. Usage remains enabled; refresh to verify the allowance.');
 if(remaining>0||percentage>0)return {verified:true,blocked:false,continuedUsage:false};
 const empty=remaining===0||percentage===0;
 const continued=q.usageAllowedWithExhaustedQuota===true||q.overageAllowedWithExhaustedQuota===true;
 if(empty&&continued)return {verified:true,blocked:false,continuedUsage:true};
 if(q.hasQuota===true)return {verified:true,blocked:false,continuedUsage:false};
 if(empty&&q.limit>0&&q.usageAllowedWithExhaustedQuota===false&&q.overageAllowedWithExhaustedQuota===false)return {verified:true,blocked:true,continuedUsage:false};
 return unknown('Copilot did not confirm whether further usage is permitted. Quota availability is unknown.');
 });
 if(states.some(state=>!state.verified))return states.find(state=>!state.verified);
 if(states.some(state=>state.blocked)&&states.some(state=>!state.blocked))return unknown('Copilot quota buckets disagree about available usage. The applicable allowance could not be determined; usage remains enabled.');
 if(states.every(state=>state.blocked)&&!model&&models.some(m=>m.billing?.multiplier===0&&!m.billing.tokenPrices))return unknown('Metered allowance is exhausted, but zero-premium-cost models are available. The default model cost is unknown; configure a model or let the CLI determine availability.');
 return {verified:true,blocked:states.every(state=>state.blocked),continuedUsage:states.some(state=>state.continuedUsage)};
}
export function normalizeCodexLimits(data){const bucket=data?.rateLimitsByLimitId?.codex||data?.rateLimits;return ['primary','secondary'].filter(k=>bucket?.[k]).map(k=>({name:k,usedPercent:bucket[k].usedPercent,remainingPercent:Math.max(0,100-bucket[k].usedPercent),windowMinutes:bucket[k].windowDurationMins,resetAt:bucket[k].resetsAt?new Date(bucket[k].resetsAt*1000).toISOString():null}));}
export function rememberUsage(provider,details){const previous=cache.get(provider)?.value;const value={...previous,id:provider,label:labels[provider],checkedAt:new Date().toISOString(),...details,...(details.status==='exhausted'?{blockedUntil:Date.now()+60000}:{})};cache.set(provider,{time:Date.now(),value});}
export async function getProviderStatus(provider,{refresh=false,fetchImpl=fetch,rpcFactory=startRpc,execImpl=exec,env=process.env,copilotModel}={}){
 if(!labels[provider])throw new Error('Unknown provider');const saved=cache.get(provider);if(saved&&!refresh&&Date.now()-saved.time<30000)return saved.value;
 const requestedModel=provider==='copilot'?(copilotModel??env.COPILOT_MODEL):undefined;
 const result={id:provider,label:labels[provider],status:'unknown',available:true,model:env[provider==='openai'?'OPENAI_MODEL':provider==='codex'?'CODEX_MODEL':'COPILOT_MODEL']||`${labels[provider]} default`,quota:[],message:'Usage and limits could not be verified.',checkedAt:new Date().toISOString(),lastUsage:saved?.value.lastUsage||null};
 if(provider==='openai'){
 if(!env.OPENAI_API_KEY?.trim()){Object.assign(result,{status:'unavailable',available:false,message:'Set OPENAI_API_KEY in .env.'});}
 else try{const response=await fetchImpl(`https://api.openai.com/v1/models/${encodeURIComponent(env.OPENAI_MODEL||'gpt-4.1')}`,{headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`},signal:AbortSignal.timeout(10000)});if(response.ok){result.message='Model access verified. Remaining API credits and quota are not available to this key.';result.model=env.OPENAI_MODEL||'gpt-4.1';}else if([401,403,404].includes(response.status)){Object.assign(result,{status:'unavailable',available:false,message:'API key or configured model access could not be verified.'});}else result.message='OpenAI access check failed. Usage and limits are unknown.';}catch{result.message='OpenAI could not be reached. Usage and limits are unknown.';}
 }else{
 let rpc,directory;try{
 const binary=env[provider==='codex'?'CODEX_CLI_PATH':'COPILOT_CLI_PATH']||provider;
 await execImpl(binary,['--version'],{timeout:5000,maxBuffer:10000});
 const childEnv={...env};delete childEnv.OPENAI_API_KEY;delete childEnv.CODEX_API_KEY;
 if(provider==='copilot')directory=await mkdtemp(join(tmpdir(),'align-copilot-check-'));
 rpc=rpcFactory(binary,provider==='codex'?['app-server','--stdio']:['--headless','--stdio','--no-auto-update','--log-level','none','--log-dir',directory,'--no-custom-instructions','--disable-builtin-mcps'],{framed:provider==='copilot',env:childEnv,...(directory?{cwd:directory}:{})});
 if(provider==='codex'){
 await rpc.request('initialize',{clientInfo:{name:'careerpilot-ai',version:'1.0.0'},capabilities:{experimentalApi:true}});rpc.notify('initialized');const account=await rpc.request('account/read',{refreshToken:false});
 if(!account.account){Object.assign(result,{status:'unavailable',available:false,message:'Run codex login to connect this provider.'});}
 else{result.quota=normalizeCodexLimits(await rpc.request('account/rateLimits/read'));if(result.quota.length){const depleted=result.quota.some(q=>q.remainingPercent<=0);Object.assign(result,{status:depleted?'exhausted':'ready',available:!depleted,message:depleted?'Codex rate limit reached. Wait for the quota window to reset.':'Codex login and rate limits verified.'});}else result.message='Codex login verified. Remaining limits were not supplied.';}
 }else{
 // Complete the SDK handshake before querying account state. Older CLIs use ping.
 try{await rpc.request('connect',{});}catch(e){if(e.code===-32601)await rpc.request('ping',{});else throw e;}
 const auth=await rpc.request('auth.getStatus',{});
 if(auth?.isAuthenticated===false){Object.assign(result,{status:'unavailable',available:false,message:'Copilot CLI is not signed in for this backend. Run copilot login in your terminal, then restart the app or refresh providers.'});}
 else if(auth?.isAuthenticated!==true){result.message='Copilot authentication status could not be verified. Update Copilot CLI and refresh providers.';}
 else{
 const models=await rpc.request('models.list',{});
 const list=Array.isArray(models)?models:models?.models;
 const selectable=availableCopilotModels(models);if(selectable)result.models=selectable;
 if(!Array.isArray(list)){result.message='Copilot login verified, but the CLI returned an unsupported model list. Update Copilot CLI and refresh providers.';}
 else if(!selectable?.length){Object.assign(result,{status:'unavailable',available:false,message:'Copilot login verified, but no models are available. Check your Copilot subscription and organization access policy.'});}
 else if(requestedModel&&!selectable.some(m=>m.id===requestedModel)){Object.assign(result,{status:'unavailable',available:false,message:'The selected Copilot model is not available to your account. Choose another model and refresh providers.'});}
 else{
 result.accessVerified=true;if(requestedModel)result.model=requestedModel;
 try{
 const quotaOptions={model:requestedModel?list.find(m=>m.id===requestedModel):undefined,models:list};
 const quotaResult=await readCopilotQuota(rpc,quotaOptions);result.quota=quotaResult.quota;result.quotaSource=quotaResult.source;result.accessVerified=true;
 const allowance=copilotAllowance(result.quota,quotaOptions);Object.assign(result,{status:allowance.blocked?'exhausted':allowance.verified?'ready':'unknown',available:!allowance.blocked,message:allowance.blocked?'Copilot allowance exhausted and further usage is not permitted. Check billing or wait for reset.':allowance.continuedUsage?'Included Copilot allowance exhausted, but your account permits continued usage. Additional charges may apply.':allowance.noMeteredQuota?'Copilot login and model access verified. The configured model has a zero premium-request multiplier.':allowance.verified?'Copilot login, model access and account quota verified.':`Copilot login and model access verified. ${allowance.reason||'Quota availability is unknown.'}`});
 }catch(e){result.message=e.code===-32601?'Copilot login and model access verified. This CLI does not support quota checks; update Copilot CLI. Limits remain unknown.':'Copilot login and model access verified, but the quota check failed. Refresh providers or check your network; limits remain unknown.';}
 }
 }
 }
 }catch(e){if(e.code==='ENOENT')Object.assign(result,{status:'unavailable',available:false,message:`${labels[provider]} is not installed.`});else if(provider==='copilot'&&/not authenticated|not logged in|not signed in|authentication required|unauthorized|invalid token|expired token/i.test(e.rpcMessage||''))Object.assign(result,{status:'unavailable',available:false,message:'Copilot authentication failed. Run copilot login, then restart the app or refresh providers.'});else if(provider==='copilot'&&e.code===-32601)result.message='Copilot CLI does not support the required account checks. Update Copilot CLI and refresh providers; limits remain unknown.';else result.message=`${labels[provider]} usage check failed. Check login and network; limits remain unknown.`;}finally{rpc?.close();if(directory)await rm(directory,{recursive:true,force:true});}
 }
 // A known exhausted quota must not become "unknown" after a failed refresh.
 if(saved?.value.status==='exhausted'&&Date.now()<(saved.value.blockedUntil||0)&&result.status==='unknown'&&(provider!=='copilot'||saved.value.quotaRejection===true))Object.assign(result,{status:'exhausted',available:false,message:saved.value.message,blockedUntil:saved.value.blockedUntil});
 cache.set(provider,{time:Date.now(),value:result});return result;
}
export async function getProviderStatuses(options={}){return Promise.all(Object.keys(labels).map(p=>getProviderStatus(p,options)));}
