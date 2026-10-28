import 'server-only';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {fileAuthEnabled,localAuth} from './local';
async function database(){return (await import('@/server/db/client')).db();}
import {opaqueToken,hashToken,validToken} from '@/lib/security';
import {HttpError} from '@/server/http';
import {SESSION_SECONDS,sessionCookieName} from './cookies';
export {SESSION_SECONDS,sessionCookieName,cookieOptions} from './cookies';
export async function createSession(userId:string){if(fileAuthEnabled())throw new HttpError(403,'Single sign-on is disabled in local mode.');const token=opaqueToken();await (await database()).session.create({data:{userId,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+SESSION_SECONDS*1000)}});return token;}
export async function currentUser(){const token=(await cookies()).get(sessionCookieName())?.value;if(!validToken(token))return null;if(fileAuthEnabled())return localAuth().currentUser(token);const session=await (await database()).session.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});return session&&session.expiresAt.getTime()>Date.now()?session.user:null;}
export async function requireUser(){const user=await currentUser();if(!user)throw new HttpError(401,'Sign in to continue.');return user;}
export async function requirePageUser(){const user=await currentUser();if(!user)redirect('/login');return user;}
export async function revokeSession(){const token=(await cookies()).get(sessionCookieName())?.value;if(fileAuthEnabled()){if(validToken(token))await localAuth().revoke(token);return;}if(validToken(token))await (await database()).session.deleteMany({where:{tokenHash:hashToken(token)}});}
