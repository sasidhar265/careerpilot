import {requireUser} from '@/server/auth/session';
import {route,assertOrigin,HttpError} from '@/server/http';
import {db} from '@/server/db/client';
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser();assertOrigin(request);const result=await db().savedSearch.deleteMany({where:{id:(await params).id,userId:user.id}});if(!result.count)throw new HttpError(404,'Search not found.');return Response.json({message:'Search deleted.'});});}
