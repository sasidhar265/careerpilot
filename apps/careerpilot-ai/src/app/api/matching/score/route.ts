import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {scoreJob,scoreInput} from '@/server/matching/service';
export async function POST(request:Request){return route(async()=>{const user=await requireUser();return Response.json({analysis:await scoreJob(user.id,await validatedJson(request,scoreInput))},{status:201});});}
