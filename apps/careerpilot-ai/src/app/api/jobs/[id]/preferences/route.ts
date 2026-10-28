import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {jobPreference,preferenceInput} from '@/server/jobs/preferences';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),preference=await jobPreference(user.id,(await params).id,await validatedJson(request,preferenceInput));return Response.json({preference,message:'Job preferences updated.'});});}
