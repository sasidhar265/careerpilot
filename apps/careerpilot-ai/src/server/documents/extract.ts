import 'server-only';
import {extractInWorker,ExtractionError} from '@/lib/profile/extraction.mjs';
import {HttpError} from '@/server/http';
export async function extractResume(buffer:Buffer,filename:string,mediaType=''){try{return await extractInWorker(buffer,filename,mediaType);}catch(error){if(error instanceof ExtractionError)throw new HttpError(error.status,error.message);throw new HttpError(422,'The document could not be extracted.');}}
