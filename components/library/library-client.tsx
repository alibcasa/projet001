'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FileText, Search, Trash2 } from 'lucide-react'
import { UploadZone } from './upload-zone'

type Doc = { id:string; title:string; total_pages:number; file_size:number; created_at:string; reading_progress?:Array<{completion_percent:number;last_page:number}> }

export function LibraryClient() {
  const [docs,setDocs]=useState<Doc[]>([]); const [q,setQ]=useState(''); const [loading,setLoading]=useState(true)
  const load=useCallback(async()=>{setLoading(true); const r=await fetch('/api/documents'); if(r.ok)setDocs(await r.json()); setLoading(false)},[])
  useEffect(()=>{load()},[load])
  const filtered=useMemo(()=>docs.filter(d=>d.title.toLowerCase().includes(q.toLowerCase())),[docs,q])
  async function remove(id:string){if(!confirm('Supprimer ce PDF ?'))return; await fetch(`/api/documents/${id}`,{method:'DELETE'}); load()}
  return <div className="space-y-6">
    <UploadZone onDone={load}/>
    <div className="flex items-center gap-3 rounded-xl border bg-white px-3"><Search className="h-4 w-4 text-zinc-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full py-3 outline-none" placeholder="Rechercher dans la bibliothèque..."/></div>
    {loading ? <p>Chargement...</p> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(d=>{const p=d.reading_progress?.[0];return <article key={d.id} className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between"><FileText/><button onClick={()=>remove(d.id)} title="Supprimer"><Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-600"/></button></div>
      <h2 className="mt-4 line-clamp-2 font-semibold">{d.title}</h2><p className="mt-1 text-sm text-zinc-500">{d.total_pages||0} pages · {(d.file_size/1048576).toFixed(1)} Mo</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-black" style={{width:`${p?.completion_percent||0}%`}}/></div><p className="mt-1 text-xs text-zinc-500">{p?.completion_percent||0}% lu {p?.last_page ? `· reprendre page ${p.last_page}`:''}</p>
      <Link href={`/reader/${d.id}`} className="mt-4 inline-block rounded-xl border px-3 py-2 text-sm font-medium">Ouvrir</Link>
    </article>})}</div>}
    {!loading && !filtered.length && <p className="rounded-xl border bg-white p-6 text-zinc-500">Aucun document.</p>}
  </div>
}
