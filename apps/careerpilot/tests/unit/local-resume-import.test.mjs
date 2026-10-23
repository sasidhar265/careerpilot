import test from 'node:test';
import assert from 'node:assert/strict';
import {importResumeText} from '../../src/lib/local-resume-import.mjs';
const text=`Alex Example
alex@example.test
+44 7700 900000
Address: 12 Example Road, London
https://www.linkedin.com/in/alex
PROFESSIONAL SUMMARY
Experienced in software testing.
TECHNICAL SKILLS
Playwright, SQL
ROLE DESCRIPTION
Test Engineer in the payments team
ROLE RESPONSIBILITIES OR DUTIES
Maintained regression test suites.
WORK EXPERIENCE
TEST ENGINEER
Example Ltd | 2021–2025
Built regression tests.
EDUCATION
BSc Computing, Provided University
PROJECTS
Personal demo project`;
test('resume import contains only the six requested career categories and source-backed role arrays',()=>{const result=importResumeText(text),fields=Object.fromEntries(result.proposals.map(item=>[item.field,item.value]));assert.equal(fields.name,undefined);assert.equal(fields.phone,undefined);assert.equal(fields.address,undefined);assert.equal(result.email,'alex@example.test');assert.equal(fields.skills,'Playwright, SQL');const experience=result.proposals.find(item=>item.field==='professionalExperience');assert.equal(experience.roles.length,1);assert.equal(experience.roles[0].jobTitle,'TEST ENGINEER');assert.equal(experience.roles[0].employer,'Example Ltd');assert.match(experience.roles[0].sourceText,/2021–2025/);assert.equal(fields.education,'BSc Computing, Provided University');assert.equal(fields.certifications,undefined);const allowed=new Set(['summary','skills','professionalExperience','certifications','achievements','education']);for(const proposal of result.proposals){assert.ok(allowed.has(proposal.field));assert.ok(text.includes(proposal.value));}});
test('unrecognised layouts, scanned text and oversized sections produce no invented fields',()=>{assert.equal(importResumeText('').proposals.length,0);const result=importResumeText('CV\nSUMMARY\n'+'x'.repeat(3001));assert.equal(result.proposals.length,0);assert.equal(result.warnings.length,1);assert.equal(importResumeText('resume\nNo recognised sections.').proposals.length,0);const unknown=importResumeText('CV\nEDUCATION\nA provided course\nREFERENCES\nSomeone else');assert.equal(unknown.proposals[0].value,'A provided course');});

test('real DOCX and PDF extraction produce reviewable profile proposals without modifying source bytes',async()=>{
 const {generateDocument}=await import('../../src/lib/builder/documents.mjs');const {extractInWorker}=await import('../../src/lib/profile/extraction.mjs');const source='Alex Example\nalex@example.test\n+44 7700 900000\n\nPROFESSIONAL SUMMARY\nSoftware tester with verified experience.\n\nWORK EXPERIENCE\nTest Engineer at Example Ltd\n2021 – 2025\nBuilt regression tests.\n\nTECHNICAL SKILLS\nPlaywright, SQL';for(const format of ['pdf','docx']){const {bytes}=await generateDocument(source,format),original=Buffer.from(bytes),extracted=await extractInWorker(bytes,`resume.${format}`),result=importResumeText(extracted.text),proposals=Object.fromEntries(result.proposals.map(item=>[item.field,item.value]));assert.equal(proposals.name,undefined);assert.match(proposals.professionalExperience,/Example Ltd/);assert.match(proposals.skills,/Playwright/);assert.deepEqual(bytes,original);}
});
