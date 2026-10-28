import {currentUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {searchJobs} from '@/server/jobs/search';
export const dynamic='force-dynamic';
export async function GET(request:Request){return route(async()=>Response.json(await searchJobs(Object.fromEntries(new URL(request.url).searchParams),(await currentUser())?.id)));}
