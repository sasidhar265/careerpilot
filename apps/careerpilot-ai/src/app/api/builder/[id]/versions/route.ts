import {z} from 'zod';
import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {saveBuilder,saveInput,builderHistory} from '@/server/builder/service';
export const runtime='nodejs';
export const maxDuration=90;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const raw=new URL(request.url).searchParams.get('before'),before=raw?z.coerce.number().int().min(1).parse(raw):undefined;return Response.json(await builderHistory((await requireUser()).id,(await params).id,before));});}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser();return Response.json({version:await saveBuilder(user.id,(await params).id,await validatedJson(request,saveInput,512*1024))},{status:201});});}
