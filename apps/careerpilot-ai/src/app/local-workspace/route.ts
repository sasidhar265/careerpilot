import {NextResponse} from 'next/server';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileAuthEnabled} from '@/server/auth/local';
import {requireLocalPageUser} from '@/server/auth/local-session';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){
 if(!fileAuthEnabled())return NextResponse.redirect(new URL('/dashboard',request.url),303);
 const user=await requireLocalPageUser();
 const html=await readFile(resolve(process.cwd(),'public/guest-assets/index.html'),'utf8');
 const config=JSON.stringify({userId:user.id,name:user.name,email:user.email}).replaceAll('<','\\u003c');
 return new Response(html.replace('<head>',`<head><script id="local-workspace-config" type="application/json">${config}</script>`),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
