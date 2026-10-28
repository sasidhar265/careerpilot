import {requireUser} from '@/server/auth/session';
import {route,validatedJson} from '@/server/http';
import {db} from '@/server/db/client';
import {saveSearch,savedSearchInput} from '@/server/jobs/preferences';
export async function GET(){return route(async()=>{const user=await requireUser();return Response.json(await db().savedSearch.findMany({where:{userId:user.id},orderBy:{createdAt:'desc'}}));});}
export async function POST(request:Request){return route(async()=>{const user=await requireUser(),search=await saveSearch(user.id,await validatedJson(request,savedSearchInput));return Response.json({search,message:'Search saved.'},{status:201});});}
