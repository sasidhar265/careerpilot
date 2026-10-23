import * as pdfjs from 'pdfjs-dist';
import {readablePdfText} from './pdf-text.js';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser';
import {createWorker} from 'tesseract.js';
import {createDocx,createPdf} from './resume-export.js';
pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
export async function extractFile(file,progress) {
 if(file.size>20*1024*1024) throw new Error('Please use a document smaller than 20 MB.');
 const ext=file.name.split('.').pop().toLowerCase();
 if(!['pdf','docx','jpeg','jpg','png'].includes(ext)) throw new Error('Choose a PDF, DOCX, JPEG, or PNG file.');
 progress('Reading your document…');
 let text='';
 if(ext==='docx') text=(await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()})).value;
 else if(ext==='pdf') {
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 let worker;
 try {for(let n=1;n<=pdf.numPages;n++){progress(`Reading page ${n} of ${pdf.numPages}…`);const page=await pdf.getPage(n);const content=await page.getTextContent();const readable=readablePdfText(content.items);let pageText=readable.text;if(readable.needsOcr){if(!worker)worker=await createWorker('eng');const viewport=page.getViewport({scale:1.6});const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;pageText=(await worker.recognize(canvas)).data.text;}text+=pageText+'\n';}}finally{if(worker)await worker.terminate();await pdf.destroy();}
 } else {const worker=await createWorker('eng',1,{logger:m=>{if(m.status==='recognizing text')progress(`Reading image… ${Math.round(m.progress*100)}%`);}});try{text=(await worker.recognize(file)).data.text;}finally{await worker.terminate();}}
 if(!text.trim())throw new Error('No readable text found. Try a clearer document or paste the text.');
 return text.trim();
}
function save(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function downloadResume(text,format,keywords=[]){if(format==='docx')save(await createDocx(text,keywords),'tailored-resume.docx');else createPdf(text,keywords).save('tailored-resume.pdf');}
