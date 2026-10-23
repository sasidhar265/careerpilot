import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runProvider} from './providers.js';
const body={provider:'copilot',model:'account-sonnet',jobDescription:'A software developer required to develop applications and maintain automated tests.'};
test('Copilot requires explicit safe model selection before checking providers',async()=>{
 for(const model of [undefined,'','bad --flag'])await assert.rejects(runProvider('job',{...body,model},{getProviderStatus:()=>assert.fail('No inference or preflight expected')}),/Select an available Copilot model/);
});
test('Copilot revalidates account access and forwards selection over backend defaults',async()=>{
 let checked=false,executed=false;
 const result=await runProvider('job',body,{
 getProviderStatus:async(provider,options)=>{checked=true;assert.equal(provider,'copilot');assert.equal(options.copilotModel,body.model);assert.equal(options.refresh,true);return {available:true,models:[{id:body.model}]};},
 copilot:{model:'wrong-default',execute:async(_binary,args)=>{executed=true;assert.equal(args[args.indexOf('--model')+1],body.model);return JSON.stringify({title:'Developer',keywords:['tests'],responsibilities:['Develop applications'],requirements:['Software development']});}},
 });assert.ok(checked&&executed);assert.equal(result.provider,'copilot');
});
test('removed account models are rejected before inference',async()=>{
 await assert.rejects(runProvider('job',body,{getProviderStatus:async()=>({available:true,models:[{id:'another-model'}]}),copilot:{execute:()=>assert.fail('Inference must not run')}}),/no longer available/);
});
