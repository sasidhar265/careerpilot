import {reserveDocumentUsage} from '@/server/usage';
import {requireUser} from '@/server/auth/session';
import {assertOrigin,boundedBody,route,HttpError} from '@/server/http';
import {uploadBaseline} from '@/server/profile/service';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){return route(async()=>{const user=await requireUser();assertOrigin(request);await reserveDocumentUsage(user.id);const type=request.headers.get('content-type');if(!type?.startsWith('multipart/form-data'))throw new HttpError(415,'Expected a file upload.');const raw=await boundedBody(request,21*1024*1024);let form:FormData;try{form=await new Response(new Uint8Array(raw),{headers:{'Content-Type':type}}).formData();}catch{throw new HttpError(400,'The multipart upload could not be read.');}const files=form.getAll('file');if(files.length!==1||!(files[0] instanceof File))throw new HttpError(400,'Choose exactly one PDF or DOCX file.');const file=files[0],buffer=Buffer.from(await file.arrayBuffer());return Response.json(await uploadBaseline(user.id,buffer,file.name,file.type),{status:201});});}
