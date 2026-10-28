import {createCareerSearch} from '@legacy/server/career-sites.js';
import {HttpError,route} from '@/server/http';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const state=globalThis as unknown as {careerpilotCareerSearch?:ReturnType<typeof createCareerSearch>};
export async function GET(request:Request){return route(async()=>{try{state.careerpilotCareerSearch??=createCareerSearch();return Response.json(await state.careerpilotCareerSearch.search(new URL(request.url).searchParams));}catch(error){if(error&&typeof error==='object'&&'status' in error&&error instanceof Error)throw new HttpError(Number(error.status),error.message);throw error;}});}
