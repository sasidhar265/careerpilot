import {z} from 'zod';
import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {trackGeneratedResume} from '@/server/tracker/service';
export async function POST(request:Request){return route(async()=>{const user=await requireUser(),input=await validatedJson(request,z.object({analysisId:z.string().min(1).max(200),resumeId:z.string().min(1).max(200)}).strict());return Response.json(await trackGeneratedResume(user.id,input.analysisId,input.resumeId));});}
