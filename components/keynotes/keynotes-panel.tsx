'use client'

import { useEffect, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'

type Note={id:string;content?:string;comment?:string;page_number:number;keynote_type:string;created_at:string}
const types=['important','memorize','question','review','legal_rule','definition','idea','summary','difficulty','mastered']

export function KeynotesPanel({documentId,page}:{documentId:string;page:number}){
  const [notes,setNotes]=useState<Note[]>([])
  const [text,setText]=useState('')
  const [type,setType]=useState('important')
  const [editing,setEditing]=useState<string|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function load(){
    const r=await fetch(`/api/keynotes?document_id=${documentId}`)
    if(r.ok)setNotes(await r.json())
  }
  useEffect(()=>{load()},[documentId])

  async function save(){
    if(!text.trim())return
    setBusy(true);setMessage('')
    const payload={document_id:documentId,page_number:page,keynote_type:type,content:text,comment:text}
    const r=await fetch(editing?`/api/keynotes/${editing}`:'/api/keynotes',{
      method:editing?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)
    })
    const d=await r.json().catch(()=>({}))
    if(r.ok){setText('');setEditing(null);setMessage(editing?'Annotation modifiée.':'Annotation ajoutée.');await load()}
    else setMessage(d.error||'Enregistrement impossible')
    setBusy(false)
  }

  function edit(n:Note){setEditing(n.id);setText(n.content||n.comment||'');setType(n.keynote_type);setMessage('')}
  function cancel(){setEditing(null);setText('');setType('important');setMessage('')}
  async function remove(id:string){
    if(!confirm('Supprimer cette annotation ?'))return
    const r=await fetch(`/api/keynotes/${id}`,{method:'DELETE'})
    if(r.ok){if(editing===id)cancel();await load()}
  }

  return <aside className="rounded-2xl border bg-white p-4">
    <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">Annotations</h2><p className="text-xs text-zinc-500">Ancrées à la page {page}</p></div>{editing&&<button onClick={cancel} className="rounded-lg p-2 hover:bg-zinc-100" title="Annuler"><X className="h-4 w-4"/></button>}</div>
    {editing&&<div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Modification d’une annotation existante</div>}
    <select className="mt-3 w-full rounded-lg border p-2 text-sm" value={type} onChange={e=>setType(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select>
    <textarea className="mt-2 min-h-24 w-full rounded-lg border p-2 text-sm" value={text} onChange={e=>setText(e.target.value)} placeholder="Règle, définition, point important..."/>
    <button disabled={busy||!text.trim()} onClick={save} className="mt-2 w-full rounded-lg bg-black py-2 text-sm text-white disabled:opacity-40">{busy?'Enregistrement...':editing?'Enregistrer la modification':'Ajouter'}</button>
    {message&&<p className="mt-2 text-xs text-zinc-500">{message}</p>}
    <div className="mt-4 max-h-[52vh] space-y-2 overflow-auto">{notes.map(n=><div key={n.id} className="rounded-lg border p-3"><div className="flex items-start justify-between gap-2"><div className="flex gap-2 text-xs text-zinc-500"><span>{n.keynote_type}</span><span>p.{n.page_number}</span></div><div className="flex gap-1"><button onClick={()=>edit(n)} className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" title="Modifier"><Pencil className="h-3.5 w-3.5"/></button><button onClick={()=>remove(n.id)} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600" title="Supprimer"><Trash2 className="h-3.5 w-3.5"/></button></div></div><p className="mt-1 whitespace-pre-wrap text-sm">{n.content||n.comment}</p></div>)}</div>
  </aside>
}
