'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert, RefreshCw } from 'lucide-react'

type Item={configured?:boolean;ready?:boolean;url?:string|null;model?:string;error?:string|null}
type Status={supabase:Item;ollama:Item;paperless:Item;joplin:Item;openproject:Item;google:Item;microsoft:Item;hypothesis:Item}

const labels:Record<keyof Status,string>={
  supabase:'Supabase',ollama:'Ollama',paperless:'Paperless-ngx',joplin:'Joplin',openproject:'OpenProject',google:'Google Workspace',microsoft:'Microsoft 365',hypothesis:'Hypothesis'
}

export function SystemStatus(){
  const [data,setData]=useState<Status|null>(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')

  async function load(){
    setBusy(true);setError('')
    try{
      const r=await fetch('/api/system/status',{cache:'no-store'})
      const d=await r.json()
      if(!r.ok)throw new Error(d.error||'Diagnostic impossible')
      setData(d)
    }catch(e:any){setError(e?.message||'Diagnostic impossible')}
    setBusy(false)
  }
  useEffect(()=>{load()},[])

  return <section className="rounded-2xl border bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Diagnostic en temps réel</h2><p className="mt-1 text-sm text-zinc-500">Vérifie les services réellement joignables depuis RevisionOS.</p></div><button onClick={load} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`}/>Actualiser</button></div>
    {error&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {!data&&!error?<p className="mt-4 text-sm text-zinc-500">Vérification...</p>:data&&<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{(Object.keys(labels) as Array<keyof Status>).map(key=>{const x=data[key];const ok=Boolean(x?.ready);const configured=Boolean(x?.configured);return <div key={key} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-2"><b className="text-sm">{labels[key]}</b>{ok?<CheckCircle2 className="h-5 w-5 text-green-600"/>:<CircleAlert className="h-5 w-5 text-amber-600"/>}</div><p className={`mt-2 text-xs font-medium ${ok?'text-green-700':'text-amber-700'}`}>{ok?'Opérationnel':configured?'Configuré mais indisponible':'Non configuré / hors ligne'}</p>{x?.model&&<p className="mt-1 truncate text-xs text-zinc-500">{x.model}</p>}{x?.url&&<p className="mt-1 truncate text-xs text-zinc-500">{x.url}</p>}{x?.error&&<p className="mt-1 line-clamp-2 text-xs text-red-600">{x.error}</p>}</div>})}</div>}
  </section>
}
