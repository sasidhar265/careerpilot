'use client';
import {useEffect,useRef,useState} from 'react';
import type {PDFDocumentProxy} from 'pdfjs-dist';
import {Button} from './ui/button';
import {RefreshCw} from 'lucide-react';
import styles from './pdf-resume-viewer.module.css';
function PdfPage({document,pageNumber,width,onRetry}:{document:PDFDocumentProxy;pageNumber:number;width:number;onRetry:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),[error,setError]=useState(''),[text,setText]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;let renderTask:{cancel:()=>void}|undefined;
 async function render(){try{const page=await document.getPage(pageNumber);if(!active||!canvas.current)return;const viewport=page.getViewport({scale:Math.min(width,900)/page.getViewport({scale:1}).width}),ratio=Math.min(window.devicePixelRatio||1,2),element=canvas.current,context=element.getContext('2d');if(!context)throw Error('Canvas is unavailable.');element.width=Math.ceil(viewport.width*ratio);element.height=Math.ceil(viewport.height*ratio);element.style.width=`${viewport.width}px`;element.style.height=`${viewport.height}px`;const task=page.render({canvas:element,canvasContext:context,viewport,transform:ratio!==1?[ratio,0,0,ratio,0,0]:undefined});renderTask=task;await task.promise;const content=await page.getTextContent();if(active){setText(content.items.map(item=>'str' in item?item.str+('hasEOL' in item&&item.hasEOL?'\n':' '):'').join(''));setReady(true);}}catch(problem){if(active&&!(problem instanceof Error&&problem.name==='RenderingCancelledException'))setError('This page could not be rendered. Retry the preview or use Download resume PDF.');}}
 void render();return()=>{active=false;renderTask?.cancel();};},[document,pageNumber,width]);
 return <article className={styles.page} aria-label={`Resume page ${pageNumber}`}><div className={styles.pageLabel}>Page {pageNumber}</div>{!ready&&!error&&<p role="status" className={styles.status}>Rendering page {pageNumber}…</p>}{error&&<div className={styles.status}><p role="alert">{error}</p><Button type="button" variant="outline" onClick={onRetry}>Retry preview</Button></div>}<canvas ref={canvas} data-pdf-page={pageNumber} role="img" aria-label={`Resume PDF page ${pageNumber}`} className={styles.canvas}/>{text&&<details className={styles.transcript}><summary>Readable text · page {pageNumber}</summary><p>{text}</p></details>}</article>;
}
export function PdfResumeViewer({blob}:{blob:Blob}){
 const host=useRef<HTMLDivElement>(null),[width,setWidth]=useState(0),[document,setDocument]=useState<PDFDocumentProxy|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 function retry(){setError('');setDocument(null);setAttempt(value=>value+1);}
 useEffect(()=>{const observer=new ResizeObserver(entries=>{const measured=entries[0]?.contentRect.width;if(measured)setWidth(Math.max(160,Math.floor(measured)));});if(host.current)observer.observe(host.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{let active=true;let task:{destroy:()=>Promise<void>}|undefined;
 async function load(){try{const pdfjs=await import('pdfjs-dist');if(!active)return;pdfjs.GlobalWorkerOptions.workerSrc=`/api/pdf-worker?v=${encodeURIComponent(pdfjs.version)}`;const bytes=new Uint8Array(await blob.arrayBuffer());if(!active)return;const loading=pdfjs.getDocument({data:bytes,useWorkerFetch:false});task=loading;const pdf=await loading.promise;if(active)setDocument(pdf);}catch{if(active)setError('The PDF viewer could not load. Retry the preview or use Download resume PDF.');}}
 void load();return()=>{active=false;void task?.destroy().catch(()=>{});};},[blob,attempt]);
 return <div ref={host} className={styles.viewer} aria-label="Saved profile resume PDF">{error?<div className={styles.status}><p role="alert">{error}</p><Button type="button" variant="outline" onClick={retry}><RefreshCw size={15} aria-hidden="true"/>Retry preview</Button></div>:!document?<p role="status" className={styles.status}>Loading PDF pages…</p>:<><div className={styles.documentInfo}>{document.numPages} {document.numPages===1?'page':'pages'} · Fit to width</div>{width>0&&Array.from({length:document.numPages},(_,index)=><PdfPage key={index} document={document} pageNumber={index+1} width={width} onRetry={retry}/>)}</>}</div>;
}
