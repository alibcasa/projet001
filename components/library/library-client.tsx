'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpen, FileText, FolderOpen, Grid2X2, List, Search, Tags, Trash2 } from 'lucide-react'
import { UploadZone } from './upload-zone'

type Category = { id:string; name:string; slug:string }
type Tag = { id:string; name:string; slug:string }
type Doc = {
  id:string
  title:string
  total_pages:number
  file_size:number
  created_at:string
  reading_progress?:Array<{completion_percent:number;last_page:number}>
  document_categories?:Array<{categories:Category|null}>
  document_tags?:Array<{tags:Tag|null}>
}

const rubriques = [
  ['all','Tous les documents'],
  ['douane','Douane'],
  ['droit','Droit'],
  ['economie','Économie'],
  ['gestion','Gestion'],
  ['informatique','Informatique'],
  ['administration-publique','Administration publique'],
  ['rapports','Rapports'],
] as const

export function LibraryClient() {
  const params=useSearchParams()
  const requested=params.get('rubrique')||'all'
  const [docs,setDocs]=useState<Doc[]>([])
  const [q,setQ]=useState('')
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState<'list'|'grid'>('list')
  const [rubrique,setRubrique]=useState(requested)

  useEffect(()=>setRubrique(requested),[requested])
  const load=useCallback(async()=>{
    setLoading(true)
    const r=await fetch('/api/documents')
    if(r.ok)setDocs(await r.json())
    setLoading(false)
  },[])
  useEffect(()=>{load()},[load])

  const filtered=useMemo(()=>docs.filter(d=>{
    const categories=(d.document_categories||[]).map(x=>x.categories?.slug).filter(Boolean)
    const tags=(d.document_tags||[]).map(x=>x.tags?.name||'').join(' ')
    const inRubrique=rubrique==='all'||categories.includes(rubrique)
    const haystack=`${d.title} ${tags} ${(d.document_categories||[]).map(x=>x.categories?.name||'').join(' ')}`.toLowerCase()
    return inRubrique && haystack.includes(q.toLowerCase())
  }),[docs,q,rubrique])

  const stats=useMemo(()=>({
    documents:filtered.length,
    pages:filtered.reduce((n,d)=>n+(d.total_pages||0),0),
    size:filtered.reduce((n,d)=>n+(d.file_size||0),0),
  }),[filtered])

  async function remove(id:string){
    if(!confirm('Supprimer définitivement ce PDF de la bibliothèque ?'))return
    await fetch(`/api/documents/${id}`,{method:'DELETE'})
    load()
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Gestion documentaire</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Bibliothèque PDF</h1>
          <p className="mt-1 text-sm text-zinc-500">Classez, recherchez, lisez et annotez vos documents juridiques, douaniers et professionnels.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-zinc-100 px-4 py-2"><div className="text-lg font-bold">{stats.documents}</div><div className="text-[11px] text-zinc-500">PDF</div></div>
          <div className="rounded-xl bg-zinc-100 px-4 py-2"><div className="text-lg font-bold">{stats.pages}</div><div className="text-[11px] text-zinc-500">pages</div></div>
          <div className="rounded-xl bg-zinc-100 px-4 py-2"><div className="text-lg font-bold">{(stats.size/1073741824).toFixed(2)}</div><div className="text-[11px] text-zinc-500">Go</div></div>
        </div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"><FolderOpen className="h-4 w-4"/>Rubriques</div>
          <div className="space-y-1">
            {rubriques.map(([slug,label])=><button key={slug} onClick={()=>setRubrique(slug)} className={`w-full rounded-xl px-3 py-2 text-left text-sm ${rubrique===slug?'bg-zinc-950 font-medium text-white':'text-zinc-700 hover:bg-zinc-100'}`}>{label}</button>)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex items-center gap-2 font-semibold"><Tags className="h-4 w-4"/>Organisation</div>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Collections, catégories et tags sont conservés avec chaque PDF pour retrouver rapidement un texte, une loi, un rapport ou un support de cours.</p>
        </div>
      </aside>

      <main className="min-w-0 space-y-4">
        <UploadZone onDone={load}/>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl bg-zinc-100 px-3"><Search className="h-4 w-4 text-zinc-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Titre, catégorie, tag, matière..."/></div>
          <div className="flex rounded-xl border border-zinc-200 p-1">
            <button onClick={()=>setView('list')} className={`rounded-lg p-2 ${view==='list'?'bg-zinc-950 text-white':'text-zinc-500'}`} title="Liste"><List className="h-4 w-4"/></button>
            <button onClick={()=>setView('grid')} className={`rounded-lg p-2 ${view==='grid'?'bg-zinc-950 text-white':'text-zinc-500'}`} title="Grille"><Grid2X2 className="h-4 w-4"/></button>
          </div>
        </div>

        {loading ? <div className="rounded-2xl border bg-white p-8 text-sm text-zinc-500">Chargement de la bibliothèque...</div> : view==='list' ?
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(280px,1fr)_150px_110px_130px_80px] gap-3 border-b bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <span>Document</span><span>Rubrique</span><span>Pages</span><span>Progression</span><span></span>
            </div>
            {filtered.map(d=>{const p=d.reading_progress?.[0]; const cats=(d.document_categories||[]).map(x=>x.categories).filter(Boolean) as Category[]; return <div key={d.id} className="grid grid-cols-[minmax(280px,1fr)_150px_110px_130px_80px] items-center gap-3 border-b px-4 py-4 last:border-b-0 hover:bg-zinc-50">
              <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-red-50 p-2 text-red-700"><FileText className="h-5 w-5"/></div><div className="min-w-0"><Link href={`/reader/${d.id}`} className="block truncate font-medium text-zinc-950 hover:underline">{d.title}</Link><div className="mt-1 flex gap-1 overflow-hidden">{(d.document_tags||[]).slice(0,3).map(t=>t.tags&&<span key={t.tags.id} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">#{t.tags.name}</span>)}</div></div></div>
              <div className="text-sm text-zinc-600">{cats[0]?.name||'Non classé'}</div>
              <div className="text-sm text-zinc-600">{d.total_pages||0}</div>
              <div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950" style={{width:`${p?.completion_percent||0}%`}}/></div><div className="mt-1 text-[11px] text-zinc-500">{p?.completion_percent||0}% {p?.last_page?`· p.${p.last_page}`:''}</div></div>
              <div className="flex justify-end gap-1"><Link href={`/reader/${d.id}`} title="Lire et annoter" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"><BookOpen className="h-4 w-4"/></Link><button onClick={()=>remove(d.id)} title="Supprimer" className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div>
            </div>})}
          </div>
        : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map(d=>{const p=d.reading_progress?.[0]; const cats=(d.document_categories||[]).map(x=>x.categories).filter(Boolean) as Category[]; return <article key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between"><div className="rounded-xl bg-red-50 p-3 text-red-700"><FileText/></div><button onClick={()=>remove(d.id)} title="Supprimer"><Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-600"/></button></div>
            <div className="mt-4 text-xs font-medium text-zinc-500">{cats[0]?.name||'Non classé'}</div><h2 className="mt-1 line-clamp-2 min-h-12 font-semibold">{d.title}</h2><p className="mt-1 text-sm text-zinc-500">{d.total_pages||0} pages · {(d.file_size/1048576).toFixed(1)} Mo</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950" style={{width:`${p?.completion_percent||0}%`}}/></div><p className="mt-1 text-xs text-zinc-500">{p?.completion_percent||0}% lu {p?.last_page?`· reprendre page ${p.last_page}`:''}</p>
            <Link href={`/reader/${d.id}`} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white"><BookOpen className="h-4 w-4"/>Lire & annoter</Link>
          </article>})}</div>}
        {!loading&&!filtered.length&&<div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-zinc-500">Aucun document dans cette rubrique. Importez un lot de PDF ou changez de filtre.</div>}
      </main>
    </div>
  </div>
}
