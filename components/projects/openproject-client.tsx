'use client'
import {FormEvent,useCallback,useEffect,useState} from 'react'

export function OpenProjectClient(){
  const[data,setData]=useState<any>(null)
  const[error,setError]=useState('')
  const[name,setName]=useState('')
  const[busy,setBusy]=useState(false)
  const load=useCallback(()=>{setError('');fetch('/api/openproject/projects').then(async r=>{const d=await r.json();if(r.ok)setData(d);else setError(d.error||'Erreur OpenProject')}).catch(()=>setError('OpenProject indisponible'))},[])
  useEffect(()=>{load()},[load])
  async function createProject(e:FormEvent){e.preventDefault();if(!name.trim())return;setBusy(true);setError('');const r=await fetch('/api/openproject/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name})});const d=await r.json();if(!r.ok)setError(d.error||d.message||'Création impossible');else{setName('');load()}setBusy(false)}
  const projects=data?._embedded?.elements||[]
  return <div className="space-y-4">
    <form onSubmit={createProject} className="flex gap-2 rounded-2xl border bg-white p-4">
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nouveau projet" className="min-w-0 flex-1 rounded-xl border px-3 py-2"/>
      <button disabled={busy} className="rounded-xl bg-zinc-900 px-4 py-2 text-white disabled:opacity-50">{busy?'Création…':'Créer'}</button>
    </form>
    <div className="rounded-2xl border bg-white p-5">{error?<p className="text-red-600">{error}</p>:<div className="space-y-3">{projects.map((p:any)=><a href={`http://localhost:8081/projects/${p.identifier||p.id}`} target="_blank" rel="noreferrer" key={p.id} className="block rounded-xl border p-4 hover:bg-zinc-50"><p className="font-medium">{p.name}</p><p className="text-xs text-zinc-500">#{p.id} · {p.identifier||''}</p></a>)}{!projects.length&&<p className="text-zinc-500">Aucun projet. Créez le premier ci-dessus.</p>}</div>}</div>
  </div>
}
