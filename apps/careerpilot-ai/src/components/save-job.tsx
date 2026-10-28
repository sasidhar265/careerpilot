'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Bookmark,Check} from 'lucide-react';
import {Button} from './ui/button';
export function SaveJob({jobId,initialSaved=false}:{jobId:string;initialSaved?:boolean}){const [saved,setSaved]=useState(initialSaved),[busy,setBusy]=useState(false),[error,setError]=useState('');const router=useRouter();async function save(){setBusy(true);setError('');try{const response=await fetch('/api/applications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId})});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not save this job.');setSaved(true);router.refresh();}catch(error){setError(error instanceof Error?error.message:'Could not save this job.');}finally{setBusy(false);}}return <div><Button variant="outline" disabled={saved||busy} onClick={save}>{saved?<Check size={15} aria-hidden="true"/>:<Bookmark size={15} aria-hidden="true"/>}{saved?'Saved':busy?'Saving…':'Save Job'}</Button>{saved&&<span className="sr-only" role="status">Job saved</span>}{error&&<p className="error mt-2" role="alert">{error}</p>}</div>;}
