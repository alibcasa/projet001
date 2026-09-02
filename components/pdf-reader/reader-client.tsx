'use client'
import { useState } from 'react'
import { Highlighter, NotebookPen } from 'lucide-react'
import { PdfViewer } from './pdf-viewer'
import { KeynotesPanel } from '@/components/keynotes/keynotes-panel'
import { JoplinReadingPanel } from '@/components/joplin/joplin-reading-panel'

export function ReaderClient({documentId,url,title,totalPages,initialPage}:{documentId:string;url:string;title:string;totalPages:number;initialPage:number}){
  const [page,setPage]=useState(initialPage)
  const [panel,setPanel]=useState<'annotations'|'notes'>('notes')
  return <div>
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Lecteur documentaire</p><h1 className="mt-1 text-xl font-semibold">{title}</h1></div>
      <div className="rounded-xl border bg-white p-1 shadow-sm">
        <button onClick={()=>setPanel('notes')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${panel==='notes'?'bg-zinc-950 text-white':'text-zinc-600 hover:bg-zinc-100'}`}><NotebookPen className="h-4 w-4"/>Remarques & résumés</button>
        <button onClick={()=>setPanel('annotations')} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${panel==='annotations'?'bg-zinc-950 text-white':'text-zinc-600 hover:bg-zinc-100'}`}><Highlighter className="h-4 w-4"/>Annotations</button>
      </div>
    </div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <PdfViewer url={url} documentId={documentId} totalPages={totalPages} initialPage={initialPage} onPageChange={setPage}/>
      {panel==='notes'?<JoplinReadingPanel documentId={documentId} documentTitle={title} page={page}/>:<KeynotesPanel documentId={documentId} page={page}/>} 
    </div>
  </div>
}
