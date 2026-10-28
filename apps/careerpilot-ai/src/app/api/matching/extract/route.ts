import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {extractJob,sourceInput} from '@/server/matching/service';
export const runtime='nodejs';
export const maxDuration=180;
export async function POST(request:Request){return route(async()=>{const user=await requireUser();return Response.json({jdVersion:await extractJob(user.id,await validatedJson(request,sourceInput))},{status:201});});}
