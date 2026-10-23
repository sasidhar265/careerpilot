import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {workspace} from '@/server/builder/service';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>Response.json(await workspace((await requireUser()).id,(await params).id)));}
