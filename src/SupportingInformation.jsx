import React,{useState} from 'react';
import {requestAI} from './ai-client.js';

export function SupportingInformation({job,sources,provider,modelPayload,busy,blocked,setBusy,setStatus,refreshProviders}){
 const [limit,setLimit]=useState(1500),[draft,setDraft]=useState(''),[notes,setNotes]=useState([]),[error,setError]=useState('');
 const words=draft.trim()?draft.trim().split(/\s+/).length:0;
 async function generate(){
  setBusy(true);setStatus('AI is writing your NHS supporting information…');setError('');
  try{const result=await requestAI('supporting',{provider,...modelPayload,jobDescription:sources.job,job,resume:sources.resume,wordLimit:Number(limit)});setDraft(result.supportingInformation);setNotes(result.reviewNotes);}
  catch(e){setError(e.message);}
  finally{setBusy(false);setStatus('');refreshProviders();}
 }
 function download(){const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='nhs-supporting-information.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="card supporting-information">
  <div className="card-heading"><div><h2>NHS supporting information</h2><p>Build your application statement from the job description, person specification and original CV. Include the person specification and trust values in your job description for a fuller statement.</p></div></div>
  <div className="supporting-limit-row"><label htmlFor="supporting-limit">Application word limit</label><input id="supporting-limit" type="number" min="100" max="3000" value={limit} disabled={busy} aria-describedby="supporting-limit-help" onChange={e=>setLimit(e.target.value)}/><small id="supporting-limit-help">100–3,000 words</small></div>
  <div className="card-footer"><small>Uses your selected AI provider and original CV evidence.</small><button className="button primary" disabled={busy||blocked||!Number.isInteger(Number(limit))||Number(limit)<100||Number(limit)>3000} onClick={generate}>{draft?'Regenerate supporting information':'Generate NHS supporting information'}</button></div>
  {error&&<p role="alert" className="error">{error}</p>}
  {draft&&<><div className="editor"><label htmlFor="supporting-draft">Review and edit your supporting information</label><textarea id="supporting-draft" value={draft} disabled={busy} onChange={e=>setDraft(e.target.value)}/></div><p role="status">{words} / {limit} words{words>Number(limit)?' — over your word limit':''}</p><button className="button primary" disabled={busy||!draft.trim()||words>Number(limit)} onClick={download}>Download supporting information (.txt)</button>{notes.length>0&&<div className="review-notes"><h3>Details to confirm before applying</h3><ul>{notes.map((note,i)=><li key={i}>{note}</li>)}</ul><p>These notes are excluded from the download.</p></div>}</>}
 </section>;
}
