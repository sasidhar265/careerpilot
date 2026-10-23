import {Worker} from 'node:worker_threads';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {dirname,join} from 'node:path';
// Resolve disk paths at runtime: bundlers may turn static require.resolve calls into numeric module IDs.
const runtimeRequire=createRequire(import.meta.url);
function resolveDependency(name){return runtimeRequire.resolve(/* turbopackIgnore: true */ name);}
export const MAX_FILE_BYTES=20*1024*1024;
export class ExtractionError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
export function validateUpload(buffer,filename,claimedType=''){if(!buffer.length||buffer.length>MAX_FILE_BYTES)throw new ExtractionError(413,'FILE_SIZE','Choose a non-empty file no larger than 20 MB.');const pdf=/\.pdf$/i.test(filename),docx=/\.docx$/i.test(filename);const type=pdf?'application/pdf':docx?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'';if(!type||pdf&&buffer.subarray(0,5).toString()!=='%PDF-'||docx&&(buffer[0]!==0x50||buffer[1]!==0x4b))throw new ExtractionError(415,'FILE_TYPE','Choose a valid PDF or DOCX document.');if(claimedType&&!['application/octet-stream',type].includes(claimedType))throw new ExtractionError(415,'MIME_MISMATCH','The file content type does not match its extension.');return type;}
// A fixed trusted worker program: no uploaded data is interpolated into executable code.
const PROGRAM=String.raw`
(async()=>{
 const {parentPort,workerData}=await import('node:worker_threads');
 const {inflateRawSync}=await import('node:zlib');
 const bytes=Buffer.from(workerData.bytes),warnings=[];
 function fail(status,code,message){const error=new Error(message);error.status=status;error.code=code;throw error;}
 function zip(){
  const LIMIT=32*1024*1024;let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(bytes.readUInt32LE(i)===0x06054b50&&i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break;}
  if(end<0)fail(422,'INVALID_DOCX','The DOCX archive is malformed.');const count=bytes.readUInt16LE(end+10),offset=bytes.readUInt32LE(end+16),directorySize=bytes.readUInt32LE(end+12);
  if(bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6)||bytes.readUInt16LE(end+8)!==count||count>500||count===65535||offset===0xffffffff||offset+directorySize!==end)fail(413,'ARCHIVE_LIMIT','Unsupported or oversized DOCX archive.');
  const names=new Set(),spans=[];let position=offset,total=0;
  const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
  for(let entry=0;entry<count;entry++){
   if(position+46>end||bytes.readUInt32LE(position)!==0x02014b50)fail(422,'INVALID_DOCX','Invalid DOCX directory.');
   const flags=bytes.readUInt16LE(position+8),method=bytes.readUInt16LE(position+10),crc=bytes.readUInt32LE(position+16),compressed=bytes.readUInt32LE(position+20),expanded=bytes.readUInt32LE(position+24),nameLength=bytes.readUInt16LE(position+28),extra=bytes.readUInt16LE(position+30),comment=bytes.readUInt16LE(position+32),local=bytes.readUInt32LE(position+42);
   if(position+46+nameLength+extra+comment>end||flags&1||![0,8].includes(method)||expanded===0xffffffff||compressed===0xffffffff||local===0xffffffff||bytes.readUInt16LE(position+34))fail(422,'INVALID_DOCX','Unsupported DOCX archive entry.');
   const name=bytes.subarray(position+46,position+46+nameLength).toString('utf8');
   if(!name||name.includes('\u0000')||name.includes('\\')||name.startsWith('/')||name.split('/').includes('..')||names.has(name)||/vbaProject\.bin$/i.test(name))fail(422,'UNSAFE_DOCX','The archive contains unsafe or duplicate entries.');names.add(name);
   if(expanded+total>LIMIT)fail(413,'ARCHIVE_LIMIT','Document expansion exceeds 32 MB.');
   if(local+30>offset||bytes.readUInt32LE(local)!==0x04034b50||bytes.readUInt16LE(local+6)!==flags||bytes.readUInt16LE(local+8)!==method)fail(422,'INVALID_DOCX','Invalid DOCX local entry.');
   const localName=bytes.readUInt16LE(local+26),localExtra=bytes.readUInt16LE(local+28),start=local+30+localName+localExtra;
   if(localName!==nameLength||!bytes.subarray(local+30,local+30+localName).equals(bytes.subarray(position+46,position+46+nameLength))||start+compressed>offset)fail(422,'INVALID_DOCX','Invalid DOCX entry bounds.');spans.push([local,start+compressed]);
   let content;try{content=method===0?bytes.subarray(start,start+compressed):inflateRawSync(bytes.subarray(start,start+compressed),{maxOutputLength:Math.max(1,LIMIT-total)});}catch{fail(413,'ARCHIVE_LIMIT','Document decompression failed or exceeded limits.');}
   if(content.length!==expanded)fail(422,'INVALID_DOCX','DOCX entry size mismatch.');let actual=0xffffffff;for(const byte of content)actual=crcTable[(actual^byte)&255]^(actual>>>8);if(((actual^0xffffffff)>>>0)!==crc)fail(422,'INVALID_DOCX','DOCX integrity check failed.');
   if(/\.(xml|rels)$/i.test(name)&&content.includes(0))fail(422,'UNSUPPORTED_XML_ENCODING','DOCX XML parts with null bytes or UTF-16 encoding are unsupported. Export a UTF-8 DOCX copy.');
   if(/\.(xml|rels)$/i.test(name)&&/<!\s*(DOCTYPE|ENTITY)\b/i.test(content.toString('utf8')))fail(422,'UNSAFE_XML','Documents with XML declarations of external entities are unsupported.');
   total+=content.length;position+=46+nameLength+extra+comment;
  }
  spans.sort((a,b)=>a[0]-b[0]);for(let i=1;i<spans.length;i++)if(spans[i][0]<spans[i-1][1])fail(422,'INVALID_DOCX','DOCX archive entries overlap.');
  if(position!==end||!names.has('word/document.xml')||!names.has('[Content_Types].xml')||!names.has('_rels/.rels'))fail(422,'INVALID_DOCX','This archive is not a complete DOCX document.');
 }
 let text='',pages=[];
 if(workerData.mediaType==='application/pdf'){
  let pdf;try{const pdfjs=await import(workerData.pdfModule);pdfjs.GlobalWorkerOptions.workerSrc=workerData.pdfWorker;pdf=await pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useWorkerFetch:false,useSystemFonts:false,disableFontFace:true,isOffscreenCanvasSupported:false,disableAutoFetch:true,stopAtErrors:true,standardFontDataUrl:workerData.standardFonts,cMapUrl:workerData.cMaps,cMapPacked:true}).promise;
   if(pdf.numPages>100)fail(413,'PAGE_LIMIT','Use a PDF with at most 100 pages.');
   if(!bytes.includes(Buffer.from('%%EOF')))warnings.push({code:'PDF_RECOVERY',message:'The PDF may be truncated or repaired. Compare extracted text with the original.'});
   for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),content=await page.getTextContent();const pageText=content.items.filter(item=>typeof item.str==='string').map(item=>item.str+(item.hasEOL?'\n':' ')).join('').trim();if(!pageText)warnings.push({code:'EMPTY_PAGE',message:'Page '+n+' has no readable text; scanned content may need manual transcription.'});if(text)text+='\n\n';const start=text.length;text+=pageText;pages.push({page:n,start,end:text.length});if(text.length>45000)fail(413,'TEXT_LIMIT','Extracted text exceeds 45,000 characters. Use a shorter document.');page.cleanup();}
  }catch(error){if(error.status)throw error;if(error.name==='PasswordException')fail(422,'PASSWORD_PROTECTED','The PDF requires a password. Upload an accessible copy.');fail(422,'INVALID_PDF','The PDF could not be safely read. It may be malformed.');}finally{if(pdf)await pdf.destroy();}
 }else{
  zip();let mammoth;try{const module=await import(workerData.mammothModule);mammoth=module.default||module;if(typeof mammoth.extractRawText!=='function')throw Error('Unavailable reader');}catch{fail(503,'READER_UNAVAILABLE','The DOCX reader is unavailable. Restart the application and retry.');}try{const result=await mammoth.extractRawText({buffer:bytes});text=result.value.trim();if(result.messages?.length)warnings.push({code:'DOCX_CONVERSION',message:'The DOCX reader reported conversion warnings. Compare the extracted text with the original.'});}catch{fail(422,'INVALID_DOCX','The DOCX content could not be read. Save a new Word Document (.docx) copy in your document editor, or export a searchable PDF and retry.');}
 }
 if(text.length>45000)fail(413,'TEXT_LIMIT','Extracted text exceeds 45,000 characters.');
 if(text.trim().length<50)warnings.push({code:'NEEDS_TEXT',message:'Too little readable text. Add a reviewed manual transcription; no OCR result is being invented.'});
 const replacement=(text.match(/\ufffd/g)||[]).length;if(replacement)warnings.push({code:'ENCODING',message:'Some characters could not be decoded. Correct them against the original.'});
 if(/\u0000/.test(text)){text=text.replace(/\u0000/g,'');warnings.push({code:'ENCODING',message:'Null characters were removed; review extraction quality.'});pages=[];}
 parentPort.postMessage({ok:true,result:{text,mediaType:workerData.mediaType,diagnostics:warnings,pages,status:text.trim().length<50?'NEEDS_TEXT':warnings.length?'NEEDS_REVIEW':'EXTRACTED'}});
})().catch(async error=>{const {parentPort}=await import('node:worker_threads');parentPort.postMessage({ok:false,status:error.status||422,code:error.code||'EXTRACTION_FAILED',message:error.status?error.message:'The document could not be safely extracted.'});});
`;
let active=0;
export async function extractInWorker(buffer,filename,claimedType=''){const mediaType=validateUpload(buffer,filename,claimedType);if(active>=2)throw new ExtractionError(429,'BUSY','Document processing is busy. Please retry shortly.');active++;try{return await new Promise((resolve,reject)=>{const worker=new Worker(PROGRAM,{eval:true,workerData:{bytes:buffer,mediaType,...(mediaType==='application/pdf'?{pdfModule:pathToFileURL(resolveDependency('pdfjs-dist/legacy/build/pdf.mjs')).href,pdfWorker:pathToFileURL(resolveDependency('pdfjs-dist/legacy/build/pdf.worker.mjs')).href,standardFonts:join(dirname(resolveDependency('pdfjs-dist/package.json')),'standard_fonts')+'/',cMaps:join(dirname(resolveDependency('pdfjs-dist/package.json')),'cmaps')+'/'}:{mammothModule:pathToFileURL(resolveDependency('mammoth')).href})},stdout:true,stderr:true,resourceLimits:{maxOldGenerationSizeMb:128,maxYoungGenerationSizeMb:32,stackSizeMb:4}});worker.stdout?.resume();worker.stderr?.resume();let done=false;const finish=(error,result)=>{if(done)return;done=true;clearTimeout(timer);void worker.terminate();if(error)reject(error);else resolve(result);};const timer=setTimeout(()=>finish(new ExtractionError(422,'TIMEOUT','Document processing exceeded its time limit. Try a simpler file.')),25000);worker.once('message',message=>message.ok?finish(null,message.result):finish(new ExtractionError(message.status,message.code,message.message)));worker.once('error',cause=>{const failure=new ExtractionError(422,'WORKER_FAILED','The document could not be safely processed.');failure.cause=cause;finish(failure);});worker.once('exit',()=>finish(new ExtractionError(422,'WORKER_FAILED','Document processing stopped before completion.')));});}finally{active--;}}
