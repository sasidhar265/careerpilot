import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {applicationUpdate} from '@/server/validation';
import {getApplication,updateApplication} from '@/server/tracker/service';
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser();const application=await updateApplication(user.id,(await params).id,await validatedJson(request,applicationUpdate,256*1024));return Response.json({message:'Application updated.',application});});}

export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>Response.json({application:await getApplication((await requireUser()).id,(await params).id)}));}
