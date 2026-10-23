import {test} from 'node:test';
import assert from 'node:assert/strict';
import {highlightResumeText} from './resume-highlights.js';
test('highlights longest literal JD matches without changing text or matching partial words',()=>{
 const text='Used sql and SQL Server with C++, Node.js, testing and PostgreSQL.';
 const runs=highlightResumeText(text,['SQL','SQL Server','C++','Node.js','test','Missing']);
 assert.equal(runs.map(run=>run.text).join(''),text);
 assert.deepEqual(runs.filter(run=>run.bold).map(run=>run.text),['sql','SQL Server','C++','Node.js']);
 assert.deepEqual(highlightResumeText(text),[{text,bold:false}]);
});
