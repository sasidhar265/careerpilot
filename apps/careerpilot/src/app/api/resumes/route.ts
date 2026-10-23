import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {resumeInput} from '@/server/validation';
import {saveResume} from '@/server/services';
export const runtime='nodejs';
export async function POST(request:Request){return route(async()=>{const user=await requireUser();const resume=await saveResume(user.id,await validatedJson(request,resumeInput));return Response.json({id:resume.id,message:'Master resume version saved.'},{status:201});});}
