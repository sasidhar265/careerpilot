import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {z} from 'zod';
import {tailorAnalysis} from '@/server/matching/service';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser();await validatedJson(request,z.object({}).strict());return Response.json(await tailorAnalysis(user.id,(await params).id));});}
