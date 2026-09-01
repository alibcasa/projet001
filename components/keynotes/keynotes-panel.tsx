'use client'

import { useEffect, useState } from 'react'

type Note={id:string;content?:string;comment?:string;page_number:number;keynote_type:string;created_at:string}
const types=['important','memorize','question','review','legal_rule','definition','idea','summary','difficulty','mastered']
export function KeynotesPanel({documentId,page}:{documentId:string;page:number}){
 const [notes,setNotes]=useState<Note[]>([]);const [text,setText]=useState('');const [type,setType]=useState('important')
 async function load(){const r=await fetch(`/api/keynotes?document_id=${documentId}`);if(r.ok)setNotes(await r.json())}
 useEffect(()=>{load()},[documentId])
 async function add(){if(!text.trim())return;await fetch('/api/keynotes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({document_id:documentId,page_number:page,keynote_type:type,content:text,comment:text})});setText('');load()}
 return <aside className="rounded-2xl border bg-white p-4"><h2 className="font-semibold">Keynotes</h2><p className="text-xs text-zinc-500">Ancrées à la page {page}</p><select className="mt-3 w-full rounded-lg border p-2 text-sm" value={type} onChange={e=>setType(e.target.value)}>{types.map(t=><option key={t}>{t}</option>)}</select><textarea className="mt-2 min-h-24 w-full rounded-lg border p-2 text-sm" value={text} onChange={e=>setText(e.target.value)} placeholder="Règle, définition, point important..."/><button onClick={add} className="mt-2 w-full rounded-lg bg-black py-2 text-sm text-white">Ajouter</button><div className="mt-4 max-h-[52vh] space-y-2 overflow-auto">{notes.map(n=><div key={n.id} className="rounded-lg border p-3"><div className="flex justify-between text-xs text-zinc-500"><span>{n.keynote_type}</span><span>p.{n.page_number}</span></div><p className="mt-1 text-sm">{n.content||n.comment}</p></div>)}</div></aside>
}
