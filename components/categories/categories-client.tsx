'use client'

import { useCallback, useEffect, useState } from 'react'
import { FolderPlus, Pencil, Save, Search, Trash2, X } from 'lucide-react'

type Category={id:string;name:string;slug:string;parent_id:string|null}

export function CategoriesClient(){
  const [items,setItems]=useState<Category[]>([])
  const [q,setQ]=useState('')
  const [name,setName]=useState('')
  const [editing,setEditing]=useState<Category|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  const load=useCallback(async()=>{
    const r=await fetch('/api/categories')
    if(r.ok)setItems(await r.json())
  },[])
  useEffect(()=>{load()},[load])

  async function create(){
    const clean=name.trim(); if(!clean)return
    setBusy(true); setMessage('')
    const r=await fetch('/api/categories',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:clean})})
    const body=await r.json().catch(()=>({}))
    if(!r.ok)setMessage(body.error||'Création impossible')
    else {setName(''); await load()}
    setBusy(false)
  }

  async function save(){
    if(!editing)return
    setBusy(true); setMessage('')
    const r=await fetch(`/api/categories/${editing.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:editing.name})})
    const body=await r.json().catch(()=>({}))
    if(!r.ok)setMessage(body.error||'Modification impossible')
    else {setEditing(null); await load()}
    setBusy(false)
  }

  async function remove(item:Category){
    if(!confirm(`Supprimer la catégorie « ${item.name} » ?`))return
    setBusy(true); setMessage('')
    const r=await fetch(`/api/categories/${item.id}`,{method:'DELETE'})
    const body=await r.json().catch(()=>({}))
    if(!r.ok)setMessage(body.error||'Suppression impossible')
    else await load()
    setBusy(false)
  }

  const filtered=items.filter(x=>`${x.name} ${x.slug}`.toLowerCase().includes(q.toLowerCase()))

  return <div className="space-y-6">
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Administration documentaire</p><h1 className="mt-1 text-2xl font-bold">Catégories PDF</h1><p className="mt-1 text-sm text-zinc-500">Créez vos rubriques métier et affectez ensuite chaque PDF à la bonne catégorie.</p></div>
        <div className="rounded-xl bg-zinc-950 px-4 py-3 text-white"><div className="text-2xl font-bold">{items.length}</div><div className="text-xs text-zinc-300">catégories</div></div>
      </div>
    </section>

    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-3">
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&create()} placeholder="Nouvelle catégorie : Ex. Contentieux douanier" className="min-w-[280px] flex-1 rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-400"/>
        <button disabled={busy||!name.trim()} onClick={create} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-40"><FolderPlus className="h-4 w-4"/>Ajouter</button>
      </div>
      {message&&<p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b bg-zinc-50 px-4 py-3"><Search className="h-4 w-4 text-zinc-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher une catégorie..." className="w-full bg-transparent text-sm outline-none"/></div>
      <div className="grid grid-cols-[minmax(260px,1fr)_minmax(180px,0.7fr)_120px] gap-3 border-b bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"><span>Nom</span><span>Identifiant</span><span className="text-right">Actions</span></div>
      {filtered.map(item=><div key={item.id} className="grid grid-cols-[minmax(260px,1fr)_minmax(180px,0.7fr)_120px] items-center gap-3 border-b px-4 py-3 last:border-0 hover:bg-zinc-50">
        {editing?.id===item.id?<input autoFocus value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} className="rounded-lg border px-3 py-2 text-sm outline-none"/>:<span className="font-medium">{item.name}</span>}
        <code className="truncate text-xs text-zinc-500">{item.slug}</code>
        <div className="flex justify-end gap-1">{editing?.id===item.id?<><button onClick={save} title="Enregistrer" className="rounded-lg p-2 hover:bg-zinc-100"><Save className="h-4 w-4"/></button><button onClick={()=>setEditing(null)} title="Annuler" className="rounded-lg p-2 hover:bg-zinc-100"><X className="h-4 w-4"/></button></>:<><button onClick={()=>setEditing(item)} title="Modifier" className="rounded-lg p-2 hover:bg-zinc-100"><Pencil className="h-4 w-4"/></button><button onClick={()=>remove(item)} title="Supprimer" className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></>}</div>
      </div>)}
      {!filtered.length&&<div className="p-8 text-center text-sm text-zinc-500">Aucune catégorie trouvée.</div>}
    </section>
  </div>
}
