import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {profileInput} from '@/server/validation';
import {saveProfile} from '@/server/services';
export const runtime='nodejs';
export async function POST(request:Request){return route(async()=>{const user=await requireUser();await saveProfile(user.id,await validatedJson(request,profileInput));return Response.json({message:'Profile saved.'});});}
