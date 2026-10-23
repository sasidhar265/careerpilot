import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function startBackend({watch=false,spawnProcess=spawn,stdout=process.stdout,stderr=process.stderr,timeoutMs=20000}={}){
 const root=fileURLToPath(new URL('../',import.meta.url));
 const child=spawnProcess(process.execPath,[...(watch?['--watch','--watch-preserve-output']:[]),fileURLToPath(new URL('../server/index.js',import.meta.url))],{cwd:root,env:process.env,stdio:['ignore','pipe','pipe']});
 let tail='',ready=false;
 const started=new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>{child.kill('SIGTERM');reject(Error('The backend did not start. Stop any old app using port 3001 and retry npm run dev.'));},timeoutMs);
 child.stdout.on('data',chunk=>{stdout.write(chunk);tail=(tail+chunk.toString()).slice(-4096);if(!ready&&tail.includes('AI server: http://127.0.0.1:3001')){ready=true;clearTimeout(timeout);resolve(child);}});
 child.stderr.on('data',chunk=>stderr.write(chunk));
 child.once('error',()=>{clearTimeout(timeout);reject(Error('Unable to start the local backend.'));});
 child.once('exit',code=>{clearTimeout(timeout);if(!ready)reject(Error(`Backend exited before startup (${code}). Check whether port 3001 is already in use.`));});
 });
 return {child,started,stop:()=>child.kill('SIGTERM')};
}
