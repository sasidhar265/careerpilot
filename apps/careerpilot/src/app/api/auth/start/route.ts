import {NextResponse} from 'next/server';
import {beginLogin,attemptCookieName} from '@/server/auth/oidc';
import {cookieOptions} from '@/server/auth/session';
import {assertOrigin,route} from '@/server/http';
export const runtime='nodejs';
export async function POST(request:Request){return route(async()=>{assertOrigin(request);const {url,encrypted}=await beginLogin();const response=NextResponse.redirect(url,303);response.cookies.set(attemptCookieName(),encrypted,cookieOptions(600));return response;});}
