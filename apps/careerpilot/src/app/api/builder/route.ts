import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {createBuilder,createInput,builderList} from '@/server/builder/service';
export const runtime='nodejs';
export const maxDuration=180;
export async function GET(request:Request){return route(async()=>Response.json(await builderList((await requireUser()).id,new URL(request.url).searchParams.get('before')||undefined)));}
export async function POST(request:Request){return route(async()=>{const user=await requireUser(),input=await validatedJson(request,createInput);return Response.json(await createBuilder(user.id,input.analysisId),{status:201});});}
