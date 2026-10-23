import {test} from 'node:test';import assert from 'node:assert/strict';import {getProviderStatus,normalizeCopilotQuota,normalizeCodexLimits,copilotAllowance,rememberUsage,readCopilotQuota} from './availability.js';
const env={};
test('unknown limits are never displayed as available verified quota',async()=>{const state=await getProviderStatus('openai',{refresh:true,env:{OPENAI_API_KEY:'test-key'},fetchImpl:async()=>({ok:true})});assert.equal(state.status,'unknown');assert.deepEqual(state.quota,[]);assert.match(state.message,/not available/);});
test('missing API credentials and CLIs disable providers',async()=>{const api=await getProviderStatus('openai',{refresh:true,env});assert.equal(api.available,false);const cli=await getProviderStatus('copilot',{refresh:true,env,execImpl:async()=>{throw Object.assign(new Error(),{code:'ENOENT'});}});assert.equal(cli.status,'unavailable');assert.equal(cli.available,false);});
test('Copilot exhausted allowance is blocked; unlimited allowance is not exhausted',async()=>{for(const [limit,expected] of [[100,'exhausted'],[-1,'ready']]){const rpcFactory=()=>({request:async(method)=>method==='auth.getStatus'?{isAuthenticated:true}:method==='connect'?{protocolVersion:3}:method==='account.getQuota'?{quotaSnapshots:{premium_interactions:{entitlementRequests:limit,usedRequests:100,remainingPercentage:0,usageAllowedWithExhaustedQuota:false,overageAllowedWithExhaustedQuota:false}}}:{models:[{id:'test-model'}]},close(){}});const state=await getProviderStatus('copilot',{refresh:true,env:{COPILOT_MODEL:'test-model'},execImpl:async()=>{},rpcFactory});assert.equal(state.status,expected);assert.equal(state.available,expected==='ready');}});
test('Codex quota windows include usage and reset time',async()=>{const data={rateLimits:{primary:{usedPercent:35,windowDurationMins:300,resetsAt:1800000000},secondary:{usedPercent:100,windowDurationMins:10080,resetsAt:1800001000}}};const rpcFactory=()=>({request:async(method)=>method==='account/read'?{account:{type:'chatgpt'}}:method==='account/rateLimits/read'?data:{},notify(){},close(){}});const state=await getProviderStatus('codex',{refresh:true,env,execImpl:async()=>{},rpcFactory});assert.equal(state.status,'exhausted');assert.equal(state.quota[0].remainingPercent,65);assert.ok(state.quota[0].resetAt);assert.equal(normalizeCodexLimits({}).length,0);assert.equal(normalizeCopilotQuota({}).length,0);});

test('Copilot continued-usage flags and unlimited entitlement keep inference available',async()=>{
 for(const flags of [{usageAllowedWithExhaustedQuota:true},{overageAllowedWithExhaustedQuota:true},{isUnlimitedEntitlement:true}]){
 const rpcFactory=()=>({request:async(method)=>method==='auth.getStatus'?{isAuthenticated:true}:method==='connect'?{protocolVersion:3}:method==='account.getQuota'?{quotaSnapshots:{premium_interactions:{entitlementRequests:100,usedRequests:100,remainingPercentage:0,...flags},chat:{entitlementRequests:0,usedRequests:0,remainingPercentage:0}}}:{models:[{id:'test-model'}]},close(){}});
 const state=await getProviderStatus('copilot',{refresh:true,env:{COPILOT_MODEL:'test-model'},execImpl:async()=>{},rpcFactory});assert.equal(state.available,true);assert.equal(state.status,'ready');
 }
});
test('an unrelated empty chat bucket does not block Copilot premium model quota',async()=>{
 const rpcFactory=()=>({request:async(method)=>method==='auth.getStatus'?{isAuthenticated:true}:method==='connect'?{protocolVersion:3}:method==='account.getQuota'?{quotaSnapshots:{premium_interactions:{entitlementRequests:100,usedRequests:20,remainingPercentage:80},chat:{entitlementRequests:0,usedRequests:0,remainingPercentage:0}}}:{models:[{id:'test-model'}]},close(){}});
 const state=await getProviderStatus('copilot',{refresh:true,env:{COPILOT_MODEL:'test-model'},execImpl:async()=>{},rpcFactory});assert.equal(state.available,true);assert.equal(state.status,'ready');
});
test('Copilot authenticates before requesting models or quota and cleans the isolated check directory',async()=>{
 const calls=[];let directory;
 const rpcFactory=(_binary,args,options)=>{directory=options.cwd;assert.ok(args.includes('--log-dir'));assert.ok(args.includes('--no-custom-instructions'));return {request:async(method)=>{calls.push(method);return method==='auth.getStatus'?{isAuthenticated:true}:method==='models.list'?{models:[{id:'test-model'}]}:method==='account.getQuota'?{quotaSnapshots:{premium_interactions:{remainingPercentage:60}}}:{protocolVersion:3};},close(){}};};
 const result=await getProviderStatus('copilot',{refresh:true,env:{},execImpl:async()=>{},rpcFactory});
 assert.equal(result.status,'ready');assert.deepEqual(calls,['connect','auth.getStatus','models.list','account.getQuota']);
 const {existsSync}=await import('node:fs');assert.equal(existsSync(directory),false);
});
test('unsigned-in Copilot disables analysis with a specific login instruction',async()=>{
 const calls=[];const rpcFactory=()=>({request:async(method)=>{calls.push(method);return method==='auth.getStatus'?{isAuthenticated:false}:{protocolVersion:3};},close(){}});
 const result=await getProviderStatus('copilot',{refresh:true,env:{},execImpl:async()=>{},rpcFactory});assert.equal(result.available,false);assert.equal(result.status,'unavailable');assert.match(result.message,/copilot login/);assert.deepEqual(calls,['connect','auth.getStatus']);
});
test('Copilot falls back to ping only for an unsupported connect handshake',async()=>{
 const calls=[];const rpcFactory=()=>({request:async(method)=>{calls.push(method);if(method==='connect')throw Object.assign(new Error(),{code:-32601});return method==='auth.getStatus'?{isAuthenticated:false}:{protocolVersion:2};},close(){}});
 const result=await getProviderStatus('copilot',{refresh:true,env:{},execImpl:async()=>{},rpcFactory});assert.equal(result.status,'unavailable');assert.deepEqual(calls,['connect','ping','auth.getStatus']);
});
test('quota failure does not hide verified login and model access',async()=>{
 const rpcFactory=()=>({request:async(method)=>{if(method==='account.getQuota')throw Object.assign(new Error(),{code:-32601});return method==='auth.getStatus'?{isAuthenticated:true}:method==='models.list'?{models:[{id:'test-model'}]}:{protocolVersion:3};},close(){}});
 const result=await getProviderStatus('copilot',{refresh:true,env:{},execImpl:async()=>{},rpcFactory});assert.equal(result.status,'unknown');assert.equal(result.available,true);assert.match(result.message,/login and model access verified/);assert.match(result.message,/does not support quota/);
});
test('missing Copilot model access is distinct from an unsupported model-list shape',async()=>{
 for(const [models,status,available] of [[{models:[]},'unavailable',false],[{unexpected:[]},'unknown',true]]){
 const rpcFactory=()=>({request:async(method)=>method==='auth.getStatus'?{isAuthenticated:true}:method==='models.list'?models:{protocolVersion:3},close(){}});
 const result=await getProviderStatus('copilot',{refresh:true,env:{},execImpl:async()=>{},rpcFactory});assert.equal(result.status,status);assert.equal(result.available,available);
 }
});
test('inactive AI credits cannot override an available premium allowance',()=>{
 const quota=normalizeCopilotQuota({quotaSnapshots:{ai_credits:{entitlementRequests:0,usedRequests:0,remainingPercentage:0,usageAllowedWithExhaustedQuota:false,overageAllowedWithExhaustedQuota:false},premium_interactions:{entitlementRequests:300,usedRequests:50,remainingPercentage:83.33}}});
 assert.deepEqual(copilotAllowance(quota),{verified:true,blocked:false,continuedUsage:false});
});
test('inconsistent counts and percentages remain unknown instead of blocking',()=>{
 for(const values of [{usedRequests:20,remainingPercentage:0},{usedRequests:100,remainingPercentage:50}]){
 const quota=normalizeCopilotQuota({quotaSnapshots:{premium_interactions:{entitlementRequests:100,...values,usageAllowedWithExhaustedQuota:false,overageAllowedWithExhaustedQuota:false}}});
 const state=copilotAllowance(quota);assert.equal(state.blocked,false);assert.equal(state.verified,false);assert.match(state.reason,/disagree/);
 }
});
test('missing permission flags do not mean continued usage is denied',()=>{
 const quota=normalizeCopilotQuota({quotaSnapshots:{premium_interactions:{entitlementRequests:100,usedRequests:100,remainingPercentage:0}}});
 assert.equal(quota[0].usageAllowedWithExhaustedQuota,null);assert.equal(copilotAllowance(quota).blocked,false);assert.equal(copilotAllowance(quota).verified,false);
});
test('conflicting active quota buckets cannot cause a false hard block',()=>{
 const quota=normalizeCopilotQuota({quotaSnapshots:{ai_credits:{entitlementRequests:100,usedRequests:100,remainingPercentage:0,usageAllowedWithExhaustedQuota:false,overageAllowedWithExhaustedQuota:false},premium_interactions:{entitlementRequests:300,usedRequests:50,remainingPercentage:83.33}}});
 assert.equal(copilotAllowance(quota).blocked,false);assert.match(copilotAllowance(quota).reason,/buckets disagree/);
});
test('zero-cost configured models, old snapshots and malformed buckets do not imply exhaustion',()=>{
 const quota=normalizeCopilotQuota({quotaSnapshots:{premium_interactions:{entitlementRequests:100,usedRequests:100,remainingPercentage:0,usageAllowedWithExhaustedQuota:false,overageAllowedWithExhaustedQuota:false}}});
 assert.equal(copilotAllowance(quota,{model:{billing:{multiplier:0}}}).blocked,false);
 assert.equal(copilotAllowance(quota,{model:{billing:{multiplier:0,tokenPrices:{inputPrice:1}}}}).blocked,true);
 assert.equal(copilotAllowance([{...quota[0],resetAt:'2000-01-01T00:00:00Z'}]).blocked,false);
 assert.equal(normalizeCopilotQuota({quotaSnapshots:{invalid:null}}).length,0);
 assert.equal(copilotAllowance(normalizeCopilotQuota({quotaSnapshots:{chat:{entitlementRequests:10,usedRequests:10,remainingPercentage:0}}})).blocked,false);
});
test('the provider remains selectable when an inactive quota precedes available allowance',async()=>{
 const rpcFactory=()=>({request:async(method)=>method==='auth.getStatus'?{isAuthenticated:true}:method==='models.list'?{models:[{id:'test-model'}]}:method==='account.getQuota'?{quotaSnapshots:{ai_credits:{entitlementRequests:0,usedRequests:0,remainingPercentage:0},premium_interactions:{entitlementRequests:300,usedRequests:50,remainingPercentage:83.33}}}:{protocolVersion:3},close(){}});
 const state=await getProviderStatus('copilot',{refresh:true,env:{COPILOT_MODEL:'test-model'},execImpl:async()=>{},rpcFactory});assert.equal(state.available,true);assert.equal(state.status,'ready');
});

test('an old inferred block is cleared by a refresh with ambiguous Copilot quota',async()=>{
 rememberUsage('copilot',{status:'exhausted',available:false,quotaRejection:false,message:'Old inferred block'});
 const rpcFactory=()=>({request:async(method)=>method==='auth.getStatus'?{isAuthenticated:true}:method==='models.list'?{models:[{id:'test-model'}]}:method==='account.getQuota'?{quotaSnapshots:{premium_interactions:{entitlementRequests:100,usedRequests:20,remainingPercentage:0}}}:{protocolVersion:3},close(){}});
 const result=await getProviderStatus('copilot',{refresh:true,env:{},execImpl:async()=>{},rpcFactory});assert.equal(result.status,'unknown');assert.equal(result.available,true);assert.match(result.message,/disagree/);
});
test('unknown default model pricing does not block an available zero-cost model',()=>{
 const quota=normalizeCopilotQuota({quotaSnapshots:{premium_interactions:{entitlementRequests:100,usedRequests:100,remainingPercentage:0,usageAllowedWithExhaustedQuota:false,overageAllowedWithExhaustedQuota:false}}});
 const result=copilotAllowance(quota,{models:[{id:'included',billing:{multiplier:0}}]});assert.equal(result.blocked,false);assert.equal(result.verified,false);
});

test('normalizes raw subscription balances without inventing billing conversions',()=>{
 const quota=normalizeCopilotQuota({quota_snapshots:{premium_interactions:{entitlement:300,remaining:250,percent_remaining:83.33,has_quota:true,overage_permitted:false,quota_reset_at:2000000000}}});
 assert.equal(quota[0].limit,300);assert.equal(quota[0].used,50);assert.equal(quota[0].remaining,250);assert.equal(copilotAllowance(quota).verified,true);assert.equal(quota[0].resetAt,new Date(2000000000000).toISOString());
});
test('falls back to whitelisted subscription fields when SDK quota contains only placeholders',async()=>{
 const calls=[];
 const rpc={request:async method=>{calls.push(method);return method==='account.getQuota'?{quotaSnapshots:{premium_interactions:{entitlementRequests:0,usedRequests:0,remainingPercentage:0}}}:{authInfo:{token:'must-not-be-exposed',login:'private-login',copilotUser:{quota_snapshots:{premium_interactions:{entitlement:300,remaining:220,has_quota:true}}}}};}};
 const result=await readCopilotQuota(rpc);
 assert.deepEqual(calls,['account.getQuota','account.getCurrentAuth']);assert.equal(result.quota[0].remaining,220);assert.equal(copilotAllowance(result.quota).verified,true);assert.ok(!JSON.stringify(result).includes('must-not-be-exposed'));assert.ok(!JSON.stringify(result).includes('private-login'));
});
test('optional unsupported subscription fallback keeps Copilot available with unknown limits',async()=>{
 const rpc={request:async method=>{if(method==='account.getCurrentAuth')throw new Error('Unsupported');return {quotaSnapshots:{}};}};
 const result=await readCopilotQuota(rpc);assert.deepEqual(result.quota,[]);assert.equal(copilotAllowance(result.quota).blocked,false);
});
test('explicit token-billing snapshots can identify inference allowance without hardcoded bucket names',()=>{
 const quota=normalizeCopilotQuota({quota_snapshots:{new_credit_bucket:{entitlement:100,remaining:80,token_based_billing:true}}});
 assert.equal(copilotAllowance(quota).verified,true);assert.equal(copilotAllowance(quota).blocked,false);
});
