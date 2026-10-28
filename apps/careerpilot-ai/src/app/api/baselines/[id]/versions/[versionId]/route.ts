import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {getVersion} from '@/server/profile/service';
export async function GET(_request:Request,{params}:{params:Promise<{id:string;versionId:string}>}){return route(async()=>{const user=await requireUser(),{id,versionId}=await params;return Response.json({version:await getVersion(user.id,id,versionId)});});}
