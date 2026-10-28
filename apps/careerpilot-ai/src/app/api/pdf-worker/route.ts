import {readPreviewWorker} from '@/lib/pdf-preview-worker.mjs';
export const runtime='nodejs';
export async function GET(){try{return new Response(new Uint8Array(await readPreviewWorker()),{headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'PDF preview worker is unavailable.'},{status:503});}}
