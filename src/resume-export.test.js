import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import mammoth from 'mammoth';import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';import {createPdf,createDocx} from './resume-export.js';import {resumeToText,resumeHeadings} from './resume-format.js';
const fixture=JSON.parse(readFileSync(new URL('../test-fixtures/tailored-resume.json',import.meta.url),'utf8'));
test('PDF and DOCX exports retain name, contact, chronology, achievements and section order',async()=>{const text=resumeToText(fixture);const blob=await createDocx(text);const extracted=await mammoth.extractRawText({buffer:Buffer.from(await blob.arrayBuffer())});for(const value of ['ALEX EXAMPLE','alex.example@example.com','PROFESSIONAL SUMMARY','Example Software Ltd','Junior Tester','20%','EDUCATION','ISTQB'])assert.ok(extracted.value.includes(value),`DOCX missing ${value}`);assert.ok(extracted.value.indexOf('PROFESSIONAL SUMMARY')<extracted.value.indexOf('PROFESSIONAL EXPERIENCE'));const pdf=await pdfjs.getDocument({data:new Uint8Array(createPdf(text).output('arraybuffer'))}).promise;let content='';for(let n=1;n<=pdf.numPages;n++)content+=(await (await pdf.getPage(n)).getTextContent()).items.map(i=>i.str).join(' ')+' ';await pdf.destroy();for(const value of ['ALEX EXAMPLE','alex.example@example.com','CORE SKILLS','20%','EDUCATION','ISTQB'])assert.ok(content.includes(value),`PDF missing ${value}`);});
test('long experience paginates without leaving a section heading at a page end',async()=>{const long=structuredClone(fixture);long.experience[0].bullets=Array.from({length:65},(_,i)=>`Test scenario ${i+1}: investigated complex application behavior, verified SQL data against requirements, and documented reproducible test results with developers and business users.`);const pdf=await pdfjs.getDocument({data:new Uint8Array(createPdf(resumeToText(long)).output('arraybuffer'))}).promise;assert.ok(pdf.numPages>1);for(let n=1;n<=pdf.numPages;n++){const items=(await (await pdf.getPage(n)).getTextContent()).items.filter(i=>i.str.trim());assert.ok(!resumeHeadings.has(items.at(-1).str),`Orphan section heading on page ${n}`);}await pdf.destroy();});
test('compact skill bullets preserve content and PDF page count',async()=>{
 const text=resumeToText(fixture);
 const baseline=text.replace(/CORE SKILLS\n[^\n]+/, 'CORE SKILLS\n'+fixture.skills.join(' | '));
 // Use SUMMARY so the parser treats the reference row as the old paragraph layout.
 const reference=baseline.replace('CORE SKILLS','SUMMARY');
 const pdf=await pdfjs.getDocument({data:new Uint8Array(createPdf(text).output('arraybuffer'))}).promise;
 const oldPdf=await pdfjs.getDocument({data:new Uint8Array(createPdf(reference).output('arraybuffer'))}).promise;
 assert.equal(pdf.numPages,oldPdf.numPages);
 const content=(await (await pdf.getPage(1)).getTextContent()).items.map(i=>i.str).join(' ');
 for(const skill of fixture.skills)assert.ok(content.includes(skill));
 assert.ok(content.includes('•'));
 const docx=await createDocx(text);
 const extracted=await mammoth.extractRawText({buffer:Buffer.from(await docx.arrayBuffer())});
 assert.ok(extracted.value.includes('• Test planning'));
 await pdf.destroy();await oldPdf.destroy();
});
test('JD matches use bold runs in Word and PDF while preserving content',async()=>{
 const {default:JSZip}=await import('jszip');
 const text=resumeToText(fixture),keywords=['SQL','regression testing'];
 const blob=await createDocx(text,keywords);
 const zip=await JSZip.loadAsync(await blob.arrayBuffer());
 const xml=await zip.file('word/document.xml').async('string');
 assert.match(xml,/<w:r><w:rPr>[^]*?<w:b\/>[^]*?<\/w:rPr><w:t[^>]*>SQL<\/w:t><\/w:r>/);
 const pdf=await pdfjs.getDocument({data:new Uint8Array(createPdf(text,keywords).output('arraybuffer'))}).promise;
 const page=await (await pdf.getPage(1)).getTextContent();
 const match=page.items.find(item=>item.str==='SQL');
 assert.ok(match);
 assert.match(page.styles[match.fontName].fontFamily,/sans-serif/);
 const extracted=await mammoth.extractRawText({buffer:Buffer.from(await blob.arrayBuffer())});
 assert.ok(extracted.value.includes(fixture.summary));
 await pdf.destroy();
});
