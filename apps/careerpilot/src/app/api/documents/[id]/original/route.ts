import {requireUser} from '@/server/auth/session';
import {route} from '@/server/http';
import {downloadOriginal} from '@/server/profile/service';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),document=await downloadOriginal(user.id,(await params).id);return new Response(new Uint8Array(document.bytes),{headers:{'Content-Type':document.mediaType,'Content-Disposition':`attachment; filename="original-resume.${document.mediaType==='application/pdf'?'pdf':'docx'}"; filename*=UTF-8''${encodeURIComponent(document.filename).replace(/['()*]/g,char=>'%'+char.charCodeAt(0).toString(16).toUpperCase())}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});});}
