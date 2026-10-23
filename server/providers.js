import {runAI,ApiError} from './ai.js';
import {runCodex} from './codex.js';
import {runCopilot} from './copilot.js';
import {getProviderStatus,rememberUsage} from './availability.js';
export async function runProvider(action,body,options={}){
 const provider=body.provider||process.env.AI_PROVIDER||'openai';
 if(!['openai','codex','copilot'].includes(provider))throw new ApiError(400,'Choose OpenAI API, Codex CLI, or GitHub Copilot as the AI provider.');
 if(provider==='copilot'&&(typeof body.model!=='string'||!/^[a-z0-9][a-z0-9._:/-]{0,199}$/i.test(body.model)))throw new ApiError(400,'Select an available Copilot model before continuing.');
 if(!options.skipPreflight){const state=await (options.getProviderStatus||getProviderStatus)(provider,{refresh:true,...(provider==='copilot'?{copilotModel:body.model}:{})});if(!state.available)throw new ApiError(state.status==='exhausted'?429:503,state.message);if(provider==='copilot'&&!state.models?.some(model=>model.id===body.model))throw new ApiError(400,'The selected Copilot model is no longer available. Refresh providers and choose another model.');}
 try{
 const result=provider==='openai'?{...await runAI(action,body,options),provider}:provider==='codex'?await runCodex(action,body,options.codex):await runCopilot(action,body,{...options.copilot,model:body.model});
 rememberUsage(provider,{lastUsage:result.usage||null});return result;
 }catch(e){if(e.status===429){const temporary=/temporarily rate-limited/.test(e.message);rememberUsage(provider,{status:'exhausted',available:false,message:e.message,temporary,quotaRejection:true});}throw e;}
}
