import {ApiError} from './ai.js';

export function matchesSchema(value,schema){
 if(!schema)return value!==null&&typeof value==='object'&&!Array.isArray(value);
 if(schema.enum&&!schema.enum.includes(value))return false;
 if(schema.type==='string')return typeof value==='string';
 if(schema.type==='boolean')return typeof value==='boolean';
 if(schema.type==='array')return Array.isArray(value)&&value.every(item=>matchesSchema(item,schema.items));
 if(schema.type==='object'){
 if(value===null||typeof value!=='object'||Array.isArray(value))return false;
 if((schema.required||[]).some(key=>!Object.hasOwn(value,key)))return false;
 if(schema.additionalProperties===false&&Object.keys(value).some(key=>!Object.hasOwn(schema.properties,key)))return false;
 return Object.entries(schema.properties).every(([key,child])=>!Object.hasOwn(value,key)||matchesSchema(value[key],child));
 }
 return false;
}
function outputError(message='Copilot returned an invalid structured result.'){
 const error=new ApiError(502,message);error.copilotOutputInvalid=true;return error;
}
function objectsInText(text){
 const objects=[];let start=-1,depth=0,quoted=false,escaped=false;
 for(let i=0;i<text.length;i++){
 const char=text[i];
 if(start<0){if(char==='{'){start=i;depth=1;}continue;}
 if(quoted){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;continue;}
 if(char==='"')quoted=true;else if(char==='{')depth++;else if(char==='}'&&--depth===0){try{objects.push(JSON.parse(text.slice(start,i+1)));}catch{}start=-1;}
 }
 return objects;
}
function parseMessage(text,schema){
 const cleaned=text.trim().replace(/^\uFEFF/,'');
 try{const result=JSON.parse(cleaned);if(matchesSchema(result,schema))return result;}catch{}
 const candidates=objectsInText(cleaned).filter(value=>matchesSchema(value,schema));
 // Ambiguous responses must not silently choose a different candidate's resume.
 if(candidates.length===1)return candidates[0];
 throw outputError(candidates.length>1?'Copilot returned multiple conflicting structured results.':'Copilot returned an invalid structured result.');
}
export function parseCopilotOutput(stdout,schema){
 if(typeof stdout!=='string'||!stdout.trim())throw outputError('Copilot did not return an assistant response.');
 const text=stdout.replace(/\u001b\[[0-9;]*m/g,'').trim();
 const records=[];
 for(const line of text.split(/\r?\n/)){try{const record=JSON.parse(line);if(record&&typeof record==='object'&&typeof record.type==='string')records.push(record);}catch{}}
 if(records.some(record=>['assistant.message','assistant.message_delta','user.message','session.start','session.error','result'].includes(record.type))){
 const terminal=records.findLast(record=>record.type==='result');
 if(records.some(record=>record.type==='session.error')||(terminal&&typeof terminal.exitCode==='number'&&terminal.exitCode!==0))throw new ApiError(502,'Copilot reported a failed session. Check Copilot login, model access, and account limits.');
 const messages=records.filter(record=>record.type==='assistant.message'&&typeof record.data?.content==='string'&&!record.data.parentToolCallId);
 if(!messages.length)throw outputError('Copilot did not return a final assistant message.');
 // Ignore echoed source documents, reasoning, tool events and streaming deltas.
 return parseMessage(messages.at(-1).data.content,schema);
 }
 return parseMessage(text,schema);
}
