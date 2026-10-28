import {currentAccountUser} from '@/server/auth/account-user';
import {fileAuthEnabled} from '@/server/auth/local';
import {resolve} from 'node:path';
import {appUrl} from '@/server/config';
import {createApiHandler} from '@legacy/server/api-handler.js';
import {guestResponse} from '@legacy/server/guest-bridge.js';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Handler=ReturnType<typeof createApiHandler>['handler'];
const state=globalThis as unknown as {careerpilotLocalWorkspaceHandler?:Handler};
async function handle(request:Request,{params}:{params:Promise<{path:string[]}>}){
 if(!fileAuthEnabled())return Response.json({error:'Local workspace is unavailable.'},{status:404});
 if(!await currentAccountUser())return Response.json({error:'Sign in to continue.',redirectTo:'/?auth=signin'},{status:403,headers:{'Cache-Control':'private, no-store'}});
 state.careerpilotLocalWorkspaceHandler??=createApiHandler({jobs:{storePath:resolve(process.cwd(),'../../.data/jobs.json'),directoryPath:resolve(process.cwd(),'../../.data/employers.json'),env:{...process.env,JOB_AUTO_REFRESH:'false'}}}).handler;
 return guestResponse(request,(await params).path.join('/'),state.careerpilotLocalWorkspaceHandler,appUrl().origin,{allowLocalAliases:process.env.NODE_ENV!=='production'});
}
export {handle as GET,handle as POST};
