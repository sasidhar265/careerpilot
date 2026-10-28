import test from 'node:test';
import assert from 'node:assert/strict';
import {linkedInSearchUrl} from './linkedin-search.js';
test('both workspace filter formats preserve search text and supported criteria',()=>{
 for(const filters of [{what:'C++ & React',where:'London',days:'7',contract:'contract',sort:'date'},{q:'C++ & React',location:'London',days:7,employment:'contract',sort:'newest'}]){
 const url=new URL(linkedInSearchUrl(filters));assert.equal(url.origin,'https://www.linkedin.com');assert.equal(url.searchParams.get('keywords'),'C++ & React');assert.equal(url.searchParams.get('location'),'London');assert.equal(url.searchParams.get('f_TPR'),'r604800');assert.equal(url.searchParams.get('f_JT'),'C');assert.equal(url.searchParams.get('sortBy'),'DD');
 }
});
test('UK default and unsupported filters do not claim LinkedIn support',()=>{
 const url=new URL(linkedInSearchUrl({salary:80000,company:'Example',contract:'permanent',days:-1,workplace:'Remote'}));assert.equal(url.searchParams.get('location'),'United Kingdom');assert.equal(url.searchParams.get('f_WT'),'2');assert.equal(url.searchParams.has('f_JT'),false);assert.equal(url.searchParams.has('f_TPR'),false);assert.equal(url.searchParams.has('salary'),false);assert.equal(url.searchParams.has('company'),false);
});
