import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {baselineList} from '@/server/profile/service';
export async function GET(){return route(async()=>{const user=await requireUser();return Response.json({baselines:await baselineList(user.id)});});}
