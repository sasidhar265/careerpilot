import {test} from 'node:test';import assert from 'node:assert/strict';import {readablePdfText} from './pdf-text.js';
test('readable recruitment cover does not trigger OCR',()=>{const result=readablePdfText([{str:'Recruitment',hasEOL:true},{str:'information pack',hasEOL:true}]);assert.equal(result.needsOcr,false);assert.match(result.text,/Recruitment\ninformation pack/);});
test('empty scans and page numbers trigger OCR',()=>{assert.equal(readablePdfText([]).needsOcr,true);assert.equal(readablePdfText([{str:'Page 1'}]).needsOcr,true);});
