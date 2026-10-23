import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreResume} from './ats-score.js';
import {prepare} from '../server/ai.js';
const original='Alex Example\nalex@example.com\n\nEXPERIENCE\nTester | Example Ltd | 2020–Present\nUsed SQL to test releases.';
const updated='Alex Example\nalex@example.com\n\nCORE SKILLS\n• SQL\n\nPROFESSIONAL EXPERIENCE\nTester\nExample Ltd | 2020–Present\n- Used SQL to test releases.';
const job={title:'Tester',keywords:['SQL','Python'],requirements:['Testing'],responsibilities:['Test releases']};
test('same fixed rubric reports before and after scores without forcing an improvement',()=>{
 const before=scoreResume(original,job),after=scoreResume(updated,job);
 assert.equal(before.coverage,50);assert.equal(after.coverage,50);
 assert.equal(before.score,55);assert.equal(after.score,65);
 assert.equal(after.structure,100);assert.deepEqual(after.missing,['python']);
 assert.deepEqual(scoreResume(original,job),before);
 assert.ok(scoreResume('',job).score<before.score);
});
test('duplicate keywords and repeated mentions cannot inflate the estimate',()=>{
 assert.equal(scoreResume(updated+' SQL SQL SQL',{...job,keywords:['SQL','sql','Python']}).score,scoreResume(updated,job).score);
 assert.equal(scoreResume('JavaScript PostgreSQL',{keywords:['Java','SQL']}).coverage,0);
});
test('missing JD keywords give no overall score and dates outside employment do not count',()=>{
 const result=scoreResume(original,{keywords:[]});assert.equal(result.score,null);assert.equal(result.coverage,null);
 const outside=scoreResume('Alex\n\nEXPERIENCE\nTester\n- Tested software\n\nEDUCATION\nDegree | 2020',job);
 assert.equal(outside.checks.find(c=>c.label==='Employment dates present').passed,false);
});
test('ATS-friendly LLM instructions are enabled by default across provider task preparation',()=>{
 const body={jobDescription:'Tester needed to create test scripts, perform UAT, query SQL and manage software defects.',job,resume:original,suggestions:[]};
 const task=prepare('rewrite',body);assert.match(task.instructions,/ATS-friendly tailoring is enabled/);assert.match(task.instructions,/never insert missing qualifications/);assert.match(task.instructions,/Do not invent or promise an ATS score/);
 assert.doesNotMatch(prepare('rewrite',{...body,atsFriendly:false}).instructions,/ATS-friendly tailoring is enabled/);
 assert.throws(()=>prepare('rewrite',{...body,atsFriendly:'yes'}),/must be a boolean/);
});
