import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {applicationInput} from '@/server/validation';
import {saveApplication,listApplications} from '@/server/tracker/service';
export async function GET(request:Request){return route(async()=>Response.json(await listApplications((await requireUser()).id,new URL(request.url))));}
export async function POST(request:Request){return route(async()=>{const application=await saveApplication((await requireUser()).id,await validatedJson(request,applicationInput));return Response.json({id:application.id,application,duplicate:application.duplicate,message:application.duplicate?'Existing application found; its status was preserved.':'Application saved.'+(application.possibleDuplicates.length?' Similar employer/role records exist; distinct requisitions were kept separate.':'')},{status:application.duplicate?200:201});});}
