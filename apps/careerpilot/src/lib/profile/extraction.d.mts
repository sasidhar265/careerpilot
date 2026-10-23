export type ExtractionResult={text:string;mediaType:string;diagnostics:{code:string;message:string}[];pages:{page:number;start:number;end:number}[];status:'EXTRACTED'|'NEEDS_REVIEW'|'NEEDS_TEXT'};
export class ExtractionError extends Error{status:number;code:string;constructor(status:number,code:string,message:string);}
export const MAX_FILE_BYTES:number;
export function validateUpload(buffer:Buffer,filename:string,claimedType?:string):string;
export function extractInWorker(buffer:Buffer,filename:string,claimedType?:string):Promise<ExtractionResult>;
