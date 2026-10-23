import {requireUser} from '@/server/auth/session';
import {route,validatedJson,HttpError} from '@/server/http';
import {assistantInput} from '@/server/validation';
import {db} from '@/server/db/client';
import {activeResume} from '@/server/profile/service';
import {runOwnedAI} from '@/server/ai/service';
import type {Prisma} from '@/generated/prisma/client';
export const runtime='nodejs';
export const maxDuration=180;
export async function POST(request:Request){return route(async()=>{const user=await requireUser(),input=await validatedJson(request,assistantInput);const resume=await activeResume(user.id);if(!resume)throw new HttpError(422,'Save a master resume before asking for career advice.');let conversation=input.conversationId?await db().conversation.findFirst({where:{id:input.conversationId,userId:user.id},include:{messages:{orderBy:{createdAt:'desc'},take:6}}}):null;if(input.conversationId&&!conversation)throw new HttpError(404,'Conversation not found.');const context=[...(conversation?.messages||[])].reverse().map(item=>`${item.role}: ${item.text}`).join('\n').slice(-12000);const result=await runOwnedAI(user.id,'career',{message:(context?`Conversation context (not verified facts):\n${context}\nLatest question: `:'')+input.message,resume:resume.text});if(typeof result.answer!=='string')throw new HttpError(502,'The provider returned an invalid answer.');if(!conversation)conversation=await db().conversation.create({data:{userId:user.id,title:input.message.slice(0,100)},include:{messages:true}});const messages=await db().$transaction([db().message.create({data:{conversationId:conversation.id,role:'user',text:input.message}}),db().message.create({data:{conversationId:conversation.id,role:'assistant',text:result.answer,evidence:JSON.parse(JSON.stringify(result.evidence||[])) as Prisma.InputJsonValue}})]);return Response.json({conversationId:conversation.id,messages});});}
