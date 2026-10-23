import 'server-only';
import {createHash} from 'node:crypto';
import {runProvider} from '@legacy/server/providers.js';
import {db} from '@/server/db/client';
import {HttpError} from '@/server/http';
import type {Prisma} from '@/generated/prisma/client';
export interface AiProvider {run(action:string,input:Record<string,unknown>):Promise<Record<string,unknown>>}
const legacyProvider:AiProvider={run:runProvider};
function json(value:unknown){return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;}
export async function runOwnedAI(userId:string,action:string,input:Record<string,unknown>,adapter:AiProvider=legacyProvider){
 const provider=process.env.AI_PROVIDER||'openai';if(!['openai','codex','copilot'].includes(provider))throw new HttpError(503,'AI provider is not configured.');
 const configuredLimit=Number(process.env.AI_DAILY_LIMIT)||20,limit=Math.max(1,Math.min(configuredLimit,100));
 const run=await db().$transaction(async tx=>{const bucket='ai:'+new Date().toISOString().slice(0,10),counter=await tx.usageCounter.upsert({where:{userId_bucket:{userId,bucket}},create:{userId,bucket,count:1},update:{count:{increment:1}}});if(counter.count>limit)throw new HttpError(429,'Daily AI request limit reached.');return tx.aiRun.create({data:{userId,action,provider,inputHash:createHash('sha256').update(JSON.stringify(input)).digest('hex')}});});
 try{const result=await adapter.run(action,{...input,provider,...(provider==='copilot'?{model:process.env.COPILOT_MODEL}: {})});await db().aiRun.update({where:{id:run.id},data:{status:'SUCCEEDED',output:json(result)}});return result;}catch(error){await db().aiRun.update({where:{id:run.id},data:{status:'FAILED'}});const code=(error as {status?:number}).status;throw new HttpError(code&&code>=400&&code<=504?code:503,'AI could not complete the request. Check the configured provider and retry.');}
}
