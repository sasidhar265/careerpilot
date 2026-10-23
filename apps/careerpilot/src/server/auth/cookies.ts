import 'server-only';
import {appUrl} from '@/server/config';
import {authCookieNames} from '@/lib/security';
/** Shared cookie policy contains no database/provider dependencies. */
export const SESSION_SECONDS=8*60*60;
export function sessionCookieName(){return authCookieNames(appUrl().href).session;}
export function cookieOptions(maxAge=SESSION_SECONDS){return {httpOnly:true,secure:appUrl().protocol==='https:',sameSite:'lax' as const,path:'/',maxAge};}
