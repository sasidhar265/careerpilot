import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {activateVersion,activateInput} from '@/server/profile/service';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),input=await validatedJson(request,activateInput);await activateVersion(user.id,(await params).id,input.versionId);return Response.json({message:'Active baseline and profile version selected.'});});}
