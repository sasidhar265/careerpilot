import {currentAccountUser,accountDestination} from '@/server/auth/account-user';
import {resolve} from 'node:path';
import {localGuestUrl} from '@/lib/guest';
import {appUrl} from '@/server/config';
import {createApiHandler} from '@legacy/server/api-handler.js';
import {guestResponse} from '@legacy/server/guest-bridge.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Handler=ReturnType<typeof createApiHandler>['handler'];
const state=globalThis as unknown as {careerpilotGuestHandler?:Handler};
async function handle(request:Request,{params}:{params:Promise<{path:string[]}>}){if(await currentAccountUser())return Response.json({error:'Open your signed-in workspace to continue.',redirectTo:accountDestination()},{status:403,headers:{'Cache-Control':'private, no-store'}});if(!localGuestUrl(process.env))return Response.json({error:'Guest mode is unavailable.'},{status:404,headers:{'Cache-Control':'private, no-store'}});state.careerpilotGuestHandler??=createApiHandler({jobs:{storePath:resolve(process.cwd(),'../../.data/jobs.json'),directoryPath:resolve(process.cwd(),'../../.data/employers.json'),env:{...process.env,JOB_AUTO_REFRESH:'false'}}}).handler;return guestResponse(request,(await params).path.join('/'),state.careerpilotGuestHandler,appUrl().origin,{allowLocalAliases:process.env.NODE_ENV!=='production'&&process.env.AUTH_MODE==='file'});}
export {handle as GET,handle as POST};
