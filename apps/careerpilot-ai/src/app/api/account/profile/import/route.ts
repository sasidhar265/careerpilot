import {fileAuthEnabled} from '@/server/auth/local';
import {currentLocalUser} from '@/server/auth/local-session';
import {assertOrigin,boundedBody,HttpError,route} from '@/server/http';
import {extractResume} from '@/server/documents/extract';
import {importResumeText} from '@/lib/local-resume-import.mjs';
export const runtime='nodejs';
export async function POST(request:Request){return route(async()=>{
 if(!fileAuthEnabled())throw new HttpError(404,'Local profile import is unavailable.');assertOrigin(request);if(!await currentLocalUser())throw new HttpError(401,'Sign in to import your resume.');
 const type=request.headers.get('content-type')||'';if(!type.startsWith('multipart/form-data'))throw new HttpError(415,'Choose a PDF or DOCX resume.');const bytes=await boundedBody(request,6*1024*1024);let form:FormData;try{form=await new Response(new Uint8Array(bytes),{headers:{'Content-Type':type}}).formData();}catch{throw new HttpError(400,'The upload could not be read.');}
 const files=form.getAll('file');if(files.length!==1||!(files[0] instanceof File))throw new HttpError(400,'Choose exactly one PDF or DOCX resume.');const file=files[0];if(!file.size||file.size>5*1024*1024)throw new HttpError(413,'Choose a non-empty resume up to 5 MB.');const result=await extractResume(Buffer.from(await file.arrayBuffer()),file.name,file.type),parsed=importResumeText(result.text);
 return Response.json({...parsed,text:result.text,warnings:[...result.diagnostics.map(item=>item.message),...parsed.warnings,'Check every selected field against the original. Layout, dates and contact recognition may be inaccurate.'],message:'Review extracted details before saving. The uploaded file is processed temporarily and is not retained.'});
});}
