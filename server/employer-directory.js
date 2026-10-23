import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {parseCareerBoard,boardKey} from './uk-employers.js';
export function createEmployerDirectory({path=null}={}){
 let entries=null,queue=Promise.resolve();
 async function load(){if(entries)return entries;if(!path)return entries=[];try{const parsed=JSON.parse(await readFile(/*turbopackIgnore: true*/ path,'utf8'));if(!Array.isArray(parsed)||parsed.length>200)throw Error();return entries=parsed.map(item=>parseCareerBoard(item.careersUrl,item.company));}catch(error){if(error.code==='ENOENT')return entries=[];throw Error('The employer directory cannot be read. Check the directory file before retrying.');}}
 return {read:async()=>{await queue;return structuredClone(await load());},add(input){const result=queue.then(async()=>{const item=parseCareerBoard(input.careersUrl,input.company),existing=await load(),next=[...existing.filter(entry=>boardKey(entry)!==boardKey(item)),item];if(next.length>200)throw Object.assign(Error('The custom directory supports up to 200 employers.'),{status:400});if(path){await mkdir(dirname(path),{recursive:true});const temporary=path+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(next),{mode:0o600});await rename(temporary,path);}entries=next;return item;});queue=result.catch(()=>{});return result;}};
}
