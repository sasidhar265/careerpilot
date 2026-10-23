import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {parseVersion,parseVersionInput} from '@/server/profile/service';
export const runtime='nodejs';
export const maxDuration=180;
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),version=await parseVersion(user.id,(await params).id,await validatedJson(request,parseVersionInput));return Response.json({version,message:'A new parsing draft was saved. Confirm uncertain fields before publishing.'},{status:201});});}
