import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PassThrough} from 'node:stream';
import {startBackend} from '../scripts/backend-process.mjs';
function fixture(watch){let invocation;const child=new EventEmitter();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=signal=>{child.signal=signal;return true;};const sink={write(){}};const result=startBackend({watch,stdout:sink,stderr:sink,spawnProcess:(...args)=>{invocation=args;return child;}});return {child,result,get invocation(){return invocation;}};}
test('development backend watches imported server modules and waits for actual readiness',async()=>{
 const f=fixture(true);assert.ok(f.invocation[1].includes('--watch'));f.child.stdout.write('AI server: http://127.0.0.1:');f.child.stdout.write('3001\n');assert.equal(await f.result.started,f.child);f.result.stop();assert.equal(f.child.signal,'SIGTERM');
});
test('production preview does not enable backend file watching',async()=>{
 const f=fixture(false);assert.ok(!f.invocation[1].includes('--watch'));f.child.stdout.write('AI server: http://127.0.0.1:3001\n');await f.result.started;f.result.stop();
});
test('backend startup failure is actionable without pretending the API is running',async()=>{
 const f=fixture(true);f.child.emit('exit',1);await assert.rejects(f.result.started,/port 3001/);
});
