import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {finishLogin,attemptCookieName} from '@/server/auth/oidc';
import {createSession,sessionCookieName,cookieOptions} from '@/server/auth/session';
import {appUrl} from '@/server/config';
export const runtime='nodejs';
export async function GET(request:Request){try{const attempt=(await cookies()).get(attemptCookieName())?.value;if(!attempt)throw Error('Missing login state');const target=new URL('/api/auth/callback',appUrl());target.search=new URL(request.url).search;const userId=await finishLogin(target,attempt);const token=await createSession(userId);const response=NextResponse.redirect(new URL('/dashboard',appUrl()));response.cookies.set(sessionCookieName(),token,cookieOptions());response.cookies.set(attemptCookieName(),'',cookieOptions(0));response.headers.set('Cache-Control','private, no-store');return response;}catch{const response=NextResponse.redirect(new URL('/login?error=verification',appUrl()));response.cookies.set(attemptCookieName(),'',cookieOptions(0));response.headers.set('Cache-Control','private, no-store');return response;}}
