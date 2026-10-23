import {test} from 'node:test';
import assert from 'node:assert/strict';
import {startRpc} from './rpc.js';
test('framed RPC preserves method-not-found codes without exposing server messages in the error text',async()=>{
 const fixture=`process.stdin.once('data',()=>{const data=Buffer.from(JSON.stringify({jsonrpc:'2.0',id:1,error:{code:-32601,message:'secret diagnostic'}}));process.stdout.write(Buffer.concat([Buffer.from('Content-Length: '+data.length+'\\r\\n\\r\\n'),data]));});`;
 const rpc=startRpc(process.execPath,['-e',fixture],{framed:true,timeout:2000});
 try{await assert.rejects(rpc.request('connect',{}),error=>{assert.equal(error.code,-32601);assert.equal(error.rpcMessage,'secret diagnostic');assert.equal(error.message,'CLI RPC request failed');return true;});}finally{rpc.close();}
});
