import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {getBuilderVersion} from '@/server/builder/service';
export async function GET(_request:Request,{params}:{params:Promise<{id:string;versionId:string}>}){return route(async()=>{const user=await requireUser(),{id,versionId}=await params;return Response.json({version:await getBuilderVersion(user.id,id,versionId)});});}
