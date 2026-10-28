import {route,HttpError} from '@/server/http';
import {db} from '@/server/db/client';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const job=await db().job.findUnique({where:{id:(await params).id},include:{employer:true,locations:true,observations:{select:{canonicalUrl:true,lastVerifiedAt:true,missingSince:true,source:{select:{provider:true,board:true}}}}}});if(!job)throw new HttpError(404,'Job not found.');return Response.json(job);});}
