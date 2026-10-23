import {spawn} from 'node:child_process';
// CLI RPC transports: Codex uses JSON lines; Copilot uses Content-Length frames.
export function startRpc(binary,args,{framed=false,timeout=12000,cwd,env=process.env}={}){
 const child=spawn(binary,args,{cwd,env,stdio:['pipe','pipe','pipe'],shell:false});
 let buffer=Buffer.alloc(0),next=0,closed=false;const pending=new Map();
 const finish=()=>{if(closed)return;closed=true;for(const {reject,timer} of pending.values()){clearTimeout(timer);reject(new Error('CLI connection ended'));}pending.clear();};
 child.on('error',finish);child.on('exit',finish);child.stderr.on('data',()=>{});child.stdin.on('error',finish);
 function send(message){const data=Buffer.from(JSON.stringify(message));child.stdin.write(framed?Buffer.concat([Buffer.from(`Content-Length: ${data.length}\r\n\r\n`),data]):Buffer.concat([data,Buffer.from('\n')]));}
 function receive(message){const entry=pending.get(message.id);if(!entry)return;clearTimeout(entry.timer);pending.delete(message.id);if(message.error){const error=new Error('CLI RPC request failed');error.code=message.error.code;error.rpcMessage=typeof message.error.message==='string'?message.error.message:'';entry.reject(error);}else entry.resolve(message.result);}
 child.stdout.on('data',chunk=>{buffer=Buffer.concat([buffer,chunk]);if(buffer.length>2*1024*1024){finish();child.kill();return;}while(buffer.length){let payload;
 if(framed){const end=buffer.indexOf('\r\n\r\n');if(end<0)break;const length=Number(buffer.subarray(0,end).toString().match(/Content-Length:\s*(\d+)/i)?.[1]);if(!Number.isFinite(length)){finish();child.kill();return;}if(buffer.length<end+4+length)break;payload=buffer.subarray(end+4,end+4+length);buffer=buffer.subarray(end+4+length);
 }else{const end=buffer.indexOf('\n');if(end<0)break;payload=buffer.subarray(0,end);buffer=buffer.subarray(end+1);}
 try{receive(JSON.parse(payload.toString()));}catch{}
 }});
 return {request(method,params={}){return new Promise((resolve,reject)=>{if(closed)return reject(new Error('CLI unavailable'));const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CLI request timed out'));},timeout);pending.set(id,{resolve,reject,timer});send({jsonrpc:'2.0',id,method,params});});},notify(method,params={}){send({jsonrpc:'2.0',method,params});},close(){finish();child.stdin.end();child.kill('SIGKILL');}};
}
