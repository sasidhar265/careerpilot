import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {ownedAnalysis} from '@/server/matching/service';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>Response.json({analysis:await ownedAnalysis((await requireUser()).id,(await params).id)}));}
