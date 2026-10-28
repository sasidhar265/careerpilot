import {NextResponse} from 'next/server';
import {currentAccountUser,accountDestination} from '@/server/auth/account-user';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {localGuestUrl} from '@/lib/guest';
export const dynamic='force-dynamic';
export const runtime='nodejs';
/** Serve the real guest bundle at this origin; no separate service or iframe. */
export async function GET(request:Request){const user=await currentAccountUser();if(user)return NextResponse.redirect(new URL(accountDestination(),request.url),303);if(!localGuestUrl(process.env))return new Response('Guest mode is available only on local development installations.',{status:404});try{const html=await readFile(resolve(process.cwd(),'public/guest-assets/index.html'),'utf8');return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}catch{return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><title>Guest workspace setup</title><main><h1>Guest workspace needs to be built</h1><p>Restart CareerPilotAI with npm run careerpilot:dev. The guest build runs automatically.</p><a href="/">Back to CareerPilotAI</a></main></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'}});}}
