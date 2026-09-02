'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, FilePenLine, RefreshCw, Save, StickyNote } from 'lucide-react'

type Note={id:string;title:string;body:string;updated_time?:number}
type Status='loading'|'disconnected'|'waiting'|'connected'|'rejected'|'offline'

export function JoplinReadingPanel({documentId,documentTitle,page}:{documentId:string;documentTitle:string;page:number}){
  const [status,setStatus]=useState<Status>('loading')
  const [notes,setNotes]=useState<Note[]>([])
  const [body,setBody]=useState('')
  const [kind,setKind]=useState<'remark'|'summary'>('remark')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const marker=`revisionos:document:${documentId}`

  const checkStatus=useCallback(async()=>{
    try{
      const r=await fetch('/api/integrations/joplin/auth',{cache:'no-store'})
      const d=await r.json()
      setStatus((d.status||'disconnected') as Status)
      return d.status as Status
    }catch{setStatus('offline');return 'offline' as Status}
  },[])

  const loadNotes=useCallback(async()=>{
    const r=await fetch('/api/integrations/joplin/notes',{cache:'no-store'})
    if(!r.ok)return
    const d=await r.json()
    const items=(d.items||[]) as Note[]
    setNotes(items.filter(n=>(n.body||'').includes(marker)))
  },[marker])

  useEffect(()=>{checkStatus()},[checkStatus])
  useEffect(()=>{if(status==='connected')loadNotes()},[status,loadNotes])
  useEffect(()=>{
    if(status!=='waiting')return
    const t=setInterval(async()=>{const s=await checkStatus();if(s==='connected')clearInterval(t)},1800)
    return()=>clearInterval(t)
  },[status,checkStatus])

  async function connect(){
    setBusy(true);setMessage('')
    const r=await fetch('/api/integrations/joplin/auth',{method:'POST'})
    const d=await r.json().catch(()=>({}))
    if(r.ok){setStatus('waiting');setMessage('Acceptez la demande dans Joplin Desktop.')}else setMessage(d.error||'Connexion Joplin impossible')
    setBusy(false)
  }

  async function save(){
    if(!body.trim())return
    setBusy(true);setMessage('')
    const label=kind==='summary'?'Résumé de lecture':'Remarque de lecture'
    const title=`${label} — ${documentTitle} — p.${page}`
    const noteBody=`# ${label}\n\n**Document :** ${documentTitle}\n\n**Page :** ${page}\n\n${body.trim()}\n\n---\n<!-- ${marker} -->\n<!-- revisionos:page:${page} -->`
    const r=await fetch('/api/integrations/joplin/notes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,body:noteBody,source_url:window.location.href})})
    const d=await r.json().catch(()=>({}))
    if(r.ok){setBody('');setMessage('Enregistré dans Joplin.');await loadNotes()}else setMessage(d.error||'Enregistrement impossible')
    setBusy(false)
  }

  const pageNotes=useMemo(()=>notes.filter(n=>(n.body||'').includes(`revisionos:page:${page}`)),[notes,page])

  if(status==='loading')return <div className="rounded-2xl border bg-white p-4 text-sm text-zinc-500">Connexion à Joplin...</div>
  if(status!=='connected')return <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
    <div className="flex items-center gap-2 font-semibold"><BookOpenCheck className="h-5 w-5"/>Joplin · Notes de lecture</div>
    <p className="mt-2 text-sm leading-5 text-zinc-500">Les remarques et résumés seront enregistrés dans votre carnet Joplin « RevisionOS Lecture ».</p>
    {status==='waiting'?<div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Autorisation en attente : ouvrez Joplin et cliquez sur <b>Accepter</b>.</div>:<button disabled={busy} onClick={connect} className="mt-4 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">Connecter Joplin</button>}
    {message&&<p className="mt-2 text-xs text-zinc-500">{message}</p>}
  </div>

  return <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b p-4">
      <div><div className="flex items-center gap-2 font-semibold"><BookOpenCheck className="h-5 w-5"/>Joplin</div><div className="mt-0.5 text-xs text-zinc-500">Page {page} · {notes.length} note(s) liées</div></div>
      <button onClick={loadNotes} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100" title="Actualiser"><RefreshCw className="h-4 w-4"/></button>
    </div>
    <div className="p-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
        <button onClick={()=>setKind('remark')} className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm ${kind==='remark'?'bg-white font-medium shadow-sm':'text-zinc-500'}`}><StickyNote className="h-4 w-4"/>Remarque</button>
        <button onClick={()=>setKind('summary')} className={`flex items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm ${kind==='summary'?'bg-white font-medium shadow-sm':'text-zinc-500'}`}><FilePenLine className="h-4 w-4"/>Résumé</button>
      </div>
      <textarea value={body} onChange={e=>setBody(e.target.value)} rows={6} className="mt-3 w-full resize-y rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-500" placeholder={kind==='summary'?'Écrivez votre résumé personnel de cette page ou de ce passage...':'Ajoutez une remarque, une idée, une difficulté ou un point important...'} />
      <button disabled={busy||!body.trim()} onClick={save} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"><Save className="h-4 w-4"/>Enregistrer dans Joplin</button>
      {message&&<p className="mt-2 text-xs text-zinc-500">{message}</p>}
    </div>
    <div className="border-t p-4">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Notes de la page {page}</div>
      <div className="max-h-72 space-y-2 overflow-auto">
        {pageNotes.length?pageNotes.map(n=><article key={n.id} className="rounded-xl border border-zinc-200 p-3"><div className="line-clamp-1 text-sm font-medium">{n.title}</div><div className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs leading-5 text-zinc-500">{n.body.replace(/<!--[^>]*-->/g,'').replace(/^# .*$/m,'').trim()}</div></article>):<div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">Aucune remarque Joplin sur cette page.</div>}
      </div>
    </div>
  </div>
}
