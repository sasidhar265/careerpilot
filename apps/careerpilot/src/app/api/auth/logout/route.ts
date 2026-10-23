import {NextResponse} from 'next/server';
import {revokeSession,sessionCookieName,cookieOptions} from '@/server/auth/session';
import {assertOrigin,route} from '@/server/http';
import {appUrl} from '@/server/config';
export async function POST(request:Request){return route(async()=>{assertOrigin(request);await revokeSession();const response=NextResponse.redirect(new URL('/login',appUrl()),303);response.cookies.set(sessionCookieName(),'',cookieOptions(0));return response;});}
