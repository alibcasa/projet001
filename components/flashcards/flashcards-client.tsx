'use client'

import { useEffect, useMemo, useState } from 'react'
import { Pencil, RotateCcw, Trash2, X } from 'lucide-react'

type Card={id:string;front:string;back:string;due_at?:string;interval_days?:number;repetitions?:number;documents?:{title?:string}|null}

export function FlashcardsClient(){
  const [cards,setCards]=useState<Card[]>([])
  const [front,setFront]=useState('')
  const [back,setBack]=useState('')
  const [flip,setFlip]=useState<string|null>(null)
  const [editing,setEditing]=useState<string|null>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function load(){const r=await fetch('/api/flashcards');if(r.ok)setCards(await r.json())}
  useEffect(()=>{load()},[])

  const due=useMemo(()=>cards.filter(c=>!c.due_at||new Date(c.due_at).getTime()<=Date.now()),[cards])

  async function save(){
    if(!front.trim()||!back.trim())return
    setBusy(true);setMessage('')
    const r=await fetch(editing?`/api/flashcards/${editing}`:'/api/flashcards',{method:editing?'PATCH':'POST',headers:{'content-type':'application/json'},body:JSON.stringify({front:front.trim(),back:back.trim()})})
    const d=await r.json().catch(()=>({}))
    if(r.ok){setFront('');setBack('');setEditing(null);setMessage(editing?'Flashcard modifiée.':'Flashcard ajoutée.');await load()}
    else setMessage(d.error||'Enregistrement impossible')
    setBusy(false)
  }

  function edit(c:Card){setEditing(c.id);setFront(c.front);setBack(c.back);setFlip(null);setMessage('')}
  function cancel(){setEditing(null);setFront('');setBack('');setMessage('')}
  async function remove(id:string){if(!confirm('Supprimer cette flashcard ?'))return;const r=await fetch(`/api/flashcards/${id}`,{method:'DELETE'});if(r.ok){if(editing===id)cancel();await load()}}
  async function rate(id:string,rating:'again'|'hard'|'good'|'easy'){
    setBusy(true);setMessage('')
    const r=await fetch(`/api/flashcards/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({rating})})
    const d=await r.json().catch(()=>({}))
    if(r.ok){setFlip(null);setMessage('Révision enregistrée.');await load()}else setMessage(d.error||'Révision impossible')
    setBusy(false)
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{editing?'Modifier la flashcard':'Nouvelle flashcard'}</h2><p className="mt-1 text-xs text-zinc-500">{due.length} carte(s) à revoir maintenant · {cards.length} au total</p></div>{editing&&<button onClick={cancel} className="rounded-lg border p-2"><X className="h-4 w-4"/></button>}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]"><input className="rounded-xl border p-3" placeholder="Question / recto" value={front} onChange={e=>setFront(e.target.value)}/><input className="rounded-xl border p-3" placeholder="Réponse / verso" value={back} onChange={e=>setBack(e.target.value)}/><button disabled={busy||!front.trim()||!back.trim()} className="rounded-xl bg-black px-5 text-white disabled:opacity-40" onClick={save}>{busy?'...':editing?'Enregistrer':'Ajouter'}</button></div>
      {message&&<p className="mt-3 text-sm text-zinc-500">{message}</p>}
    </section>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(c=>{const isFlip=flip===c.id;const isDue=!c.due_at||new Date(c.due_at).getTime()<=Date.now();return <article key={c.id} className={`min-h-52 rounded-2xl border bg-white p-5 shadow-sm ${isDue?'border-zinc-300':'border-zinc-200'}`}>
      <div className="flex items-start justify-between gap-2"><button onClick={()=>setFlip(isFlip?null:c.id)} className="min-w-0 flex-1 text-left"><p className="text-xs uppercase text-zinc-400">{isFlip?'Réponse':'Question'}</p><p className="mt-4 whitespace-pre-wrap font-medium">{isFlip?c.back:c.front}</p></button><div className="flex gap-1"><button onClick={()=>edit(c)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100"><Pencil className="h-4 w-4"/></button><button onClick={()=>remove(c.id)} className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div></div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500"><span>{isDue?'À revoir maintenant':`Prévue ${c.due_at?new Date(c.due_at).toLocaleDateString('fr-FR'):''}`}</span><span>{c.interval_days||0} j · {c.repetitions||0} rép.</span></div>
      {isFlip&&<div className="mt-4 grid grid-cols-4 gap-1 border-t pt-4"><button disabled={busy} onClick={()=>rate(c.id,'again')} className="rounded-lg bg-red-50 px-2 py-2 text-xs text-red-700">Encore</button><button disabled={busy} onClick={()=>rate(c.id,'hard')} className="rounded-lg bg-amber-50 px-2 py-2 text-xs text-amber-700">Difficile</button><button disabled={busy} onClick={()=>rate(c.id,'good')} className="rounded-lg bg-green-50 px-2 py-2 text-xs text-green-700">Bien</button><button disabled={busy} onClick={()=>rate(c.id,'easy')} className="rounded-lg bg-blue-50 px-2 py-2 text-xs text-blue-700">Facile</button></div>}
      {!isFlip&&<button onClick={()=>setFlip(c.id)} className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-zinc-600"><RotateCcw className="h-3.5 w-3.5"/>Voir la réponse</button>}
    </article>})}</div>
  </div>
}
