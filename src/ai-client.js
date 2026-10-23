import {applicationFetch} from './http-client.js';
const connectionError='The AI backend is unavailable. Stop the app and restart it with npm run dev (or npm start for a production preview).';
export async function requestAI(action,data,{fetchImpl=applicationFetch}={}){
 let response;
 try{response=await fetchImpl(`/api/ai/${action}`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(200000)});}catch(e){throw new Error(e.name==='TimeoutError'?'AI analysis timed out. Please retry with a shorter document.':connectionError);}
 // A missing backend or static-only preview can return HTML or an empty proxy error.
 // Do not expose response bodies: they may contain document data or server details.
 let raw;try{raw=await response.text();}catch{throw new Error(connectionError);}
 if(!response.headers.get('content-type')?.includes('application/json'))throw new Error(connectionError);
 let result;try{result=JSON.parse(raw);}catch{throw new Error('The AI backend returned invalid JSON. Restart the app and retry.');}
 if(!response.ok)throw new Error(typeof result?.error==='string'?result.error:`AI request failed (HTTP ${response.status}). Please retry.`);
 if(!result||typeof result!=='object'||Array.isArray(result))throw new Error('The AI backend returned an invalid result. Please retry.');
 return result;
}
