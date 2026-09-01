'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

export function PdfViewer({ url, documentId, initialPage=1, totalPages: initialTotal=0, onPageChange }: {url:string;documentId:string;initialPage?:number;totalPages?:number;onPageChange?:(p:number)=>void}) {
  const canvasRef=useRef<HTMLCanvasElement>(null); const [pdf,setPdf]=useState<any>(null); const [page,setPage]=useState(initialPage); const [scale,setScale]=useState(1.25); const [total,setTotal]=useState(initialTotal)
  useEffect(()=>{let cancelled=false;(async()=>{const pdfjs=await import('pdfjs-dist'); pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).toString(); const doc=await pdfjs.getDocument(url).promise;if(!cancelled){setPdf(doc);setTotal(doc.numPages)}})();return()=>{cancelled=true}},[url])
  useEffect(()=>{if(!pdf||!canvasRef.current)return;let active=true;(async()=>{const p=await pdf.getPage(page); const viewport=p.getViewport({scale}); const canvas=canvasRef.current!; const ctx=canvas.getContext('2d')!; canvas.width=viewport.width; canvas.height=viewport.height; if(active)await p.render({canvasContext:ctx,viewport}).promise; fetch('/api/progress',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({document_id:documentId,page,total_pages:total})}).catch(()=>{}); onPageChange?.(page)})();return()=>{active=false}},[pdf,page,scale,total,documentId,onPageChange])
  return <div className="flex min-h-[75vh] flex-col rounded-2xl border bg-zinc-100">
    <div className="sticky top-0 z-10 flex items-center justify-center gap-2 border-b bg-white p-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft/></button><span className="min-w-28 text-center text-sm">Page {page} / {total||'?'}</span><button onClick={()=>setPage(p=>Math.min(total||p+1,p+1))}><ChevronRight/></button><span className="mx-2 h-6 border-l"/><button onClick={()=>setScale(s=>Math.max(.5,s-.15))}><ZoomOut/></button><span className="text-xs">{Math.round(scale*100)}%</span><button onClick={()=>setScale(s=>Math.min(3,s+.15))}><ZoomIn/></button></div>
    <div className="flex flex-1 justify-center overflow-auto p-5"><canvas ref={canvasRef} className="h-fit max-w-full shadow-xl"/></div>
  </div>
}
