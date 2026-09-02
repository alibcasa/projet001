'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpenCheck, FilePlus2, RefreshCw, Save, Search, Trash2 } from 'lucide-react'

type Note={id:string;title:string;body:string;updated_time?:number}
type Status='loading'|'disconnected'|'waiting'|'connected'|'rejected'|'offline'

export function JoplinNotesWorkspace(){
  const [status,setStatus]=useState<Status>('loading')
  const [notes,setNotes]=useState<Note[]>([])
  const [selected,setSelected]=useState<string|null>(null)
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [q,setQ]=useState('')
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  const check=useCallback(async()=>{try{const r=await fetch('/api/integrations/joplin/auth',{cache:'no-store'});const d=await r.json();setStatus((d.status||'disconnected') as Status);return d.status as Status}catch{setStatus('offline');return'offline' as Status}},[])
  const load=useCallback(async(search='')=>{const r=await fetch(`/api/integrations/joplin/notes${search?`?q=${encodeURIComponent(search)}`:''}`,{cache:'no-store'});if(!r.ok)return;const d=await r.json();setNotes(d.items||[])},[])

  useEffect(()=>{check()},[check])
  useEffect(()=>{if(status==='connected')load()},[status,load])
  useEffect(()=>{if(status!=='waiting')return;const t=setInterval(async()=>{const s=await check();if(s==='connected')clearInterval(t)},1800);return()=>clearInterval(t)},[status,check])
  useEffect(()=>{const t=setTimeout(()=>{if(status==='connected')load(q)},250);return()=>clearTimeout(t)},[q,status,load])

  const current=useMemo(()=>notes.find(n=>n.id===selected)||null,[notes,selected])
  useEffect(()=>{if(current){setTitle(current.title);setBody(current.body)}},[current])

  async function connect(){setBusy(true);setMessage('');const r=await fetch('/api/integrations/joplin/auth',{method:'POST'});const d=await r.json().catch(()=>({}));if(r.ok){setStatus('waiting');setMessage('Acceptez la demande dans Joplin Desktop.')}else setMessage(d.error||'Connexion impossible');setBusy(false)}
  function newNote(){setSelected(null);setTitle('');setBody('')}
  async function save(){if(!title.trim())return;setBusy(true);setMessage('');const isEdit=!!selected;const r=await fetch(isEdit?`/api/integrations/joplin/notes/${selected}`:'/api/integrations/joplin/notes',{method:isEdit?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,body})});const d=await r.json().catch(()=>({}));if(r.ok){setMessage(isEdit?'Note modifiée.':'Note créée.');await load(q);if(!isEdit&&d.id)setSelected(d.id)}else setMessage(d.error||'Enregistrement impossible');setBusy(false)}
  async function remove(){if(!selected||!confirm('Mettre cette note Joplin à la corbeille ?'))return;setBusy(true);const r=await fetch(`/api/integrations/joplin/notes/${selected}`,{method:'DELETE'});if(r.ok){setSelected(null);setTitle('');setBody('');await load(q)}setBusy(false)}

  if(status!=='connected')return <div className="mx-auto max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-2xl bg-zinc-950 p-3 text-white"><BookOpenCheck/></div><div><h1 className="text-2xl font-bold">Notes Joplin</h1><p className="text-sm text-zinc-500">Carnets, remarques et résumés de lecture dans RevisionOS.</p></div></div><p className="mt-6 text-sm leading-6 text-zinc-600">RevisionOS utilise l’API locale officielle de Joplin. Activez Web Clipper dans Joplin, puis autorisez RevisionOS lorsque Joplin affiche la demande.</p>{status==='waiting'?<div className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Autorisation en attente dans Joplin...</div>:<button disabled={busy} onClick={connect} className="mt-5 rounded-xl bg-zinc-950 px-5 py-3 text-sm font-medium text-white">Connecter Joplin</button>}{message&&<p className="mt-3 text-sm text-zinc-500">{message}</p>}</div>

  return <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Joplin · RevisionOS</p><h1 className="text-xl font-bold">Notes & résumés</h1></div><div className="flex gap-2"><button onClick={()=>load(q)} className="rounded-xl border p-2.5 text-zinc-500 hover:bg-zinc-50" title="Actualiser"><RefreshCw className="h-4 w-4"/></button><button onClick={newNote} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white"><FilePlus2 className="h-4 w-4"/>Nouvelle note</button></div></div>
    <div className="grid min-h-[680px] lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="border-r bg-zinc-50/70">
        <div className="border-b p-3"><div className="flex items-center gap-2 rounded-xl border bg-white px-3"><Search className="h-4 w-4 text-zinc-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" placeholder="Rechercher dans Joplin..."/></div></div>
        <div className="max-h-[620px] overflow-auto p-2">{notes.map(n=><button key={n.id} onClick={()=>setSelected(n.id)} className={`mb-1 w-full rounded-xl p-3 text-left ${selected===n.id?'bg-zinc-950 text-white':'hover:bg-white'}`}><div className="line-clamp-1 text-sm font-semibold">{n.title||'Sans titre'}</div><div className={`mt-1 line-clamp-2 text-xs leading-5 ${selected===n.id?'text-zinc-300':'text-zinc-500'}`}>{(n.body||'').replace(/[#*<>!-]/g,' ').replace(/\s+/g,' ').trim()}</div></button>)}</div>
      </aside>
      <main className="flex min-w-0 flex-col">
        <div className="flex items-center gap-2 border-b p-4"><input value={title} onChange={e=>setTitle(e.target.value)} className="min-w-0 flex-1 rounded-xl border px-4 py-2.5 font-semibold outline-none focus:border-zinc-500" placeholder="Titre de la note"/><button disabled={busy||!title.trim()} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"><Save className="h-4 w-4"/>Enregistrer</button>{selected&&<button disabled={busy} onClick={remove} className="rounded-xl border p-2.5 text-zinc-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>}</div>
        <textarea value={body} onChange={e=>setBody(e.target.value)} className="min-h-[560px] flex-1 resize-none p-6 font-mono text-sm leading-7 outline-none" placeholder="Écrivez une remarque, un résumé, une synthèse, une idée... Markdown accepté."/>
        <div className="border-t px-5 py-3 text-xs text-zinc-500">{message||'Synchronisé avec Joplin Desktop via API locale.'}</div>
      </main>
    </div>
  </div>
}
