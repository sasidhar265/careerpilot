import test from 'node:test';
import assert from 'node:assert/strict';
import {profileOverlap} from '../../src/lib/recommendations.ts';
test('baseline recommendations explain matched skills without inventing an AI score',()=>{const result=profileOverlap(['Playwright','SQL','Playwright'],{title:'Automation Engineer',description:'Build Playwright testing with SQL checks.'});assert.deepEqual(result.matches,['Playwright','SQL']);assert.equal(result.matched,2);assert.equal('score' in result,false);});
test('a missing candidate profile produces no recommendations',()=>{assert.equal(profileOverlap([],{title:'Engineer',description:'Testing'}).matched,0);});
