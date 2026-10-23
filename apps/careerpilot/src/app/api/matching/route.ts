import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {matchHistory} from '@/server/matching/service';
export async function GET(request:Request){return route(async()=>Response.json(await matchHistory((await requireUser()).id,new URL(request.url).searchParams.get('before')||undefined)));}
