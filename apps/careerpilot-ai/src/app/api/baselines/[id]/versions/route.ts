import {z} from 'zod';
import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {versions,saveVersion,editVersionInput} from '@/server/profile/service';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),value=new URL(request.url).searchParams.get('before'),before=value?z.coerce.number().int().min(1).parse(value):undefined;return Response.json(await versions(user.id,(await params).id,before));});}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),version=await saveVersion(user.id,(await params).id,await validatedJson(request,editVersionInput,512*1024));return Response.json({version,message:version.status==='CONFIRMED'?'Confirmed profile version saved.':'Draft version saved. Uncertain facts remain unpublished.'},{status:201});});}
