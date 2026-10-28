import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {ownedBaseline,versions} from '@/server/profile/service';
import {db} from '@/server/db/client';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),id=(await params).id,[baseline,history]=await Promise.all([ownedBaseline(user.id,id),versions(user.id,id)]);const version=await db().profileVersion.findFirst({where:{userId:user.id,baselineId:id},orderBy:{revision:'desc'}});return Response.json({baseline,version,history});});}
