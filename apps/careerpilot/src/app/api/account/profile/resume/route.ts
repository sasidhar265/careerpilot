import {cookies} from 'next/headers';
import {sessionCookieName} from '@/server/auth/cookies';
import {fileAuthEnabled,localAuth} from '@/server/auth/local';
import {HttpError,route} from '@/server/http';
import {createSidebarProfilePdf} from '@/lib/profile-sidebar-pdf.mjs';
export const runtime='nodejs';
export async function GET(){return route(async()=>{if(!fileAuthEnabled())throw new HttpError(404,'Local resume download is unavailable.');const token=(await cookies()).get(sessionCookieName())?.value,profile=await localAuth().profile(token);if(!profile)throw new HttpError(401,'Sign in to download your resume.');let document;try{document=await createSidebarProfilePdf(profile);}catch{throw new HttpError(422,'The PDF could not preserve all profile text. Check unsupported characters or shorten very long content, then retry.');}const name=(profile.name||'careerpilot').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,80)||'careerpilot';return new Response(new Uint8Array(document.bytes),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${name}-CV.pdf"`,'X-Content-Type-Options':'nosniff'}});});}
