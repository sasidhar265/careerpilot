import {requireUser} from '@/server/auth/session';
import {route,HttpError} from '@/server/http';
import {ownedResume} from '@/server/services';
import {db} from '@/server/db/client';
import {validatedDocument} from '@/lib/builder/documents.mjs';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return route(async()=>{const user=await requireUser(),resume=await ownedResume(user.id,(await params).id),format=new URL(request.url).searchParams.get('format');if(format!=='pdf'&&format!=='docx')throw new HttpError(400,'Choose PDF or DOCX.');const version=await db().builderVersion.findUnique({where:{resumeId:resume.id},select:{status:true,template:true}});if(version&&version.status!=='APPROVED')throw new HttpError(422,'Approve this builder version before export.');try{const result=await validatedDocument(resume.text,format,version?.template==='compact-uk'?'compact-uk':'classic-uk');return new Response(new Uint8Array(result.bytes),{headers:{'Content-Type':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':`attachment; filename="careerpilot-cv.${format}"`,'Cache-Control':'private, no-store','X-Resume-Validation':result.validation.status,'X-Content-Type-Options':'nosniff'}});}catch(error){throw new HttpError(422,error instanceof Error?error.message:'Document validation failed.');}});}
