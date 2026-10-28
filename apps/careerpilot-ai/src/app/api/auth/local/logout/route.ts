import {NextResponse} from 'next/server';
import {revokeLocalSession} from '@/server/auth/local-session';
import {sessionCookieName,cookieOptions} from '@/server/auth/cookies';
import {fileAuthEnabled} from '@/server/auth/local';
import {assertOrigin,HttpError,route} from '@/server/http';
export async function POST(request:Request){return route(async()=>{const origin=assertOrigin(request);if(!fileAuthEnabled())throw new HttpError(404,'Local authentication is disabled.');await revokeLocalSession();const response=NextResponse.redirect(new URL('/login',origin),303);response.cookies.set(sessionCookieName(),'',cookieOptions(0));return response;});}
