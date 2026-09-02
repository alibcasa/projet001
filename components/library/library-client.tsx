'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookOpen, FileText, FolderOpen, Grid2X2, List, Pencil, Search, Tags, Trash2, X } from 'lucide-react'
import { UploadZone } from './upload-zone'

type Category={id:string;name:string;slug:string;parent_id?:string|null}
type Tag={id:string;name:string}
type Doc={
  id:string;title:string;description?:string|null;total_pages:number;file_size:number;created_at:string;
  reading_progress?:Array<{completion_percent:number;last_page:number}>;
  document_categories?:Array<{category_id?:string;categories:Category|null}>;
  document_tags?:Array<{tags:Tag|null}>;
}

type Editor={id:string;title:string;description:string;category_id:string}

export function LibraryClient(){
  const params=useSearchParams()
  const requested=params.get('rubrique')||'all'
  const [docs,setDocs]=useState<Doc[]>([])
  const [categories,setCategories]=useState<Category[]>([])
  const [q,setQ]=useState('')
  const [loading,setLoading]=useState(true)
  const [view,setView]=useState<'list'|'grid'>('list')
  const [rubrique,setRubrique]=useState(requested)
  const [editor,setEditor]=useState<Editor|null>(null)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')

  useEffect(()=>setRubrique(requested),[requested])
  const load=useCallback(async()=>{
    setLoading(true)
    const [documentsResponse,categoriesResponse]=await Promise.all([fetch('/api/documents'),fetch('/api/categories')])
    if(documentsResponse.ok)setDocs(await documentsResponse.json())
    if(categoriesResponse.ok)setCategories(await categoriesResponse.json())
    setLoading(false)
  },[])
  useEffect(()=>{load()},[load])

  const filtered=useMemo(()=>docs.filter(d=>{
    const cats=(d.document_categories||[]).map(x=>x.categories?.slug).filter(Boolean)
    const tags=(d.document_tags||[]).map(x=>x.tags?.name||'').join(' ')
    const inCategory=rubrique==='all'||cats.includes(rubrique)
    const haystack=`${d.title} ${d.description||''} ${tags} ${(d.document_categories||[]).map(x=>x.categories?.name||'').join(' ')}`.toLowerCase()
    return inCategory&&haystack.includes(q.toLowerCase())
  }),[docs,q,rubrique])

  const stats=useMemo(()=>({documents:filtered.length,pages:filtered.reduce((n,d)=>n+(d.total_pages||0),0),size:filtered.reduce((n,d)=>n+(d.file_size||0),0)}),[filtered])

  function openEditor(d:Doc){
    const category=d.document_categories?.[0]?.categories
    setError('')
    setEditor({id:d.id,title:d.title,description:d.description||'',category_id:category?.id||''})
  }

  async function saveEditor(){
    if(!editor||!editor.title.trim())return
    setSaving(true);setError('')
    const r=await fetch(`/api/documents/${editor.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:editor.title.trim(),description:editor.description.trim(),category_id:editor.category_id||null})})
    const body=await r.json().catch(()=>({}))
    if(!r.ok)setError(body.error||'Modification impossible')
    else {setEditor(null);await load()}
    setSaving(false)
  }

  async function remove(id:string){
    if(!confirm('Supprimer définitivement ce PDF et ses données associées ?'))return
    await fetch(`/api/documents/${id}`,{method:'DELETE'})
    load()
  }

  return <div className="space-y-5">
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Document Center</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Bibliothèque PDF professionnelle</h1><p className="mt-1 text-sm text-zinc-500">Import en lot, classement, renommage, métadonnées, lecture, notes et annotations.</p></div>
        <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-zinc-100 px-4 py-2"><div className="text-lg font-bold">{stats.documents}</div><div className="text-[11px] text-zinc-500">PDF</div></div><div className="rounded-xl bg-zinc-100 px-4 py-2"><div className="text-lg font-bold">{stats.pages}</div><div className="text-[11px] text-zinc-500">pages</div></div><div className="rounded-xl bg-zinc-100 px-4 py-2"><div className="text-lg font-bold">{(stats.size/1073741824).toFixed(2)}</div><div className="text-[11px] text-zinc-500">Go</div></div></div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500"><FolderOpen className="h-4 w-4"/>Catégories</div>
          <button onClick={()=>setRubrique('all')} className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm ${rubrique==='all'?'bg-zinc-950 font-medium text-white':'hover:bg-zinc-100'}`}>Tous les documents</button>
          {categories.map(c=><button key={c.id} onClick={()=>setRubrique(c.slug)} className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm ${rubrique===c.slug?'bg-zinc-950 font-medium text-white':'text-zinc-700 hover:bg-zinc-100'}`}>{c.name}</button>)}
          <Link href="/categories" className="mt-2 block rounded-xl border border-dashed px-3 py-2 text-center text-xs font-medium text-zinc-600 hover:bg-zinc-50">Gérer les catégories</Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm shadow-sm"><div className="flex items-center gap-2 font-semibold"><Tags className="h-4 w-4"/>Organisation</div><p className="mt-2 text-xs leading-5 text-zinc-500">Chaque PDF peut être renommé et affecté à une catégorie métier. Les tags et annotations restent liés au document.</p></div>
      </aside>

      <main className="min-w-0 space-y-4">
        <UploadZone onDone={load}/>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
          <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-xl bg-zinc-100 px-3"><Search className="h-4 w-4 text-zinc-400"/><input value={q} onChange={e=>setQ(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" placeholder="Rechercher titre, description, catégorie ou tag..."/></div>
          <div className="flex rounded-xl border border-zinc-200 p-1"><button onClick={()=>setView('list')} className={`rounded-lg p-2 ${view==='list'?'bg-zinc-950 text-white':'text-zinc-500'}`}><List className="h-4 w-4"/></button><button onClick={()=>setView('grid')} className={`rounded-lg p-2 ${view==='grid'?'bg-zinc-950 text-white':'text-zinc-500'}`}><Grid2X2 className="h-4 w-4"/></button></div>
        </div>

        {loading?<div className="rounded-2xl border bg-white p-8 text-sm text-zinc-500">Chargement de la bibliothèque...</div>:view==='list'?
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="grid grid-cols-[minmax(300px,1fr)_170px_90px_130px_120px] gap-3 border-b bg-zinc-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500"><span>Document</span><span>Catégorie</span><span>Pages</span><span>Progression</span><span className="text-right">Actions</span></div>
            {filtered.map(d=>{const p=d.reading_progress?.[0];const cat=d.document_categories?.[0]?.categories;return <div key={d.id} className="grid grid-cols-[minmax(300px,1fr)_170px_90px_130px_120px] items-center gap-3 border-b px-4 py-4 last:border-b-0 hover:bg-zinc-50">
              <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-red-50 p-2 text-red-700"><FileText className="h-5 w-5"/></div><div className="min-w-0"><Link href={`/reader/${d.id}`} className="block truncate font-medium text-zinc-950 hover:underline">{d.title}</Link><p className="mt-1 truncate text-xs text-zinc-500">{d.description||'Aucune description'}</p></div></div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-medium ${cat?'bg-zinc-100 text-zinc-700':'bg-amber-50 text-amber-700'}`}>{cat?.name||'Non classé'}</span>
              <span className="text-sm text-zinc-600">{d.total_pages||0}</span>
              <div><div className="h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950" style={{width:`${p?.completion_percent||0}%`}}/></div><div className="mt-1 text-[11px] text-zinc-500">{p?.completion_percent||0}% {p?.last_page?`· p.${p.last_page}`:''}</div></div>
              <div className="flex justify-end gap-1"><button onClick={()=>openEditor(d)} title="Modifier le PDF" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><Pencil className="h-4 w-4"/></button><Link href={`/reader/${d.id}`} title="Lire et annoter" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"><BookOpen className="h-4 w-4"/></Link><button onClick={()=>remove(d.id)} title="Supprimer" className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div>
            </div>})}
          </div>
        :<div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map(d=>{const p=d.reading_progress?.[0];const cat=d.document_categories?.[0]?.categories;return <article key={d.id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="rounded-xl bg-red-50 p-3 text-red-700"><FileText/></div><button onClick={()=>openEditor(d)} className="rounded-lg p-2 hover:bg-zinc-100"><Pencil className="h-4 w-4"/></button></div><div className="mt-4 text-xs font-medium text-zinc-500">{cat?.name||'Non classé'}</div><h2 className="mt-1 line-clamp-2 min-h-12 font-semibold">{d.title}</h2><p className="mt-1 line-clamp-2 min-h-10 text-sm text-zinc-500">{d.description||'Aucune description'}</p><p className="mt-2 text-xs text-zinc-500">{d.total_pages||0} pages · {(d.file_size/1048576).toFixed(1)} Mo</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950" style={{width:`${p?.completion_percent||0}%`}}/></div><div className="mt-4 flex gap-2"><Link href={`/reader/${d.id}`} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white"><BookOpen className="h-4 w-4"/>Lire & annoter</Link><button onClick={()=>remove(d.id)} className="rounded-xl border px-3 py-2 text-zinc-500 hover:text-red-600"><Trash2 className="h-4 w-4"/></button></div></article>})}</div>}
        {!loading&&!filtered.length&&<div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-zinc-500">Aucun PDF trouvé. Importez des documents ou changez de catégorie.</div>}
      </main>
    </div>

    {editor&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><h2 className="font-semibold">Modifier le PDF</h2><p className="text-xs text-zinc-500">Nom, description et catégorie principale</p></div><button onClick={()=>setEditor(null)} className="rounded-lg p-2 hover:bg-zinc-100"><X className="h-4 w-4"/></button></div><div className="space-y-4 p-5"><label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Nom du PDF</span><input value={editor.title} onChange={e=>setEditor({...editor,title:e.target.value})} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-zinc-400"/></label><label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Catégorie</span><select value={editor.category_id} onChange={e=>setEditor({...editor,category_id:e.target.value})} className="w-full rounded-xl border bg-white px-3 py-2.5 text-sm"><option value="">Non classé</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-zinc-500">Description / remarque générale</span><textarea rows={4} value={editor.description} onChange={e=>setEditor({...editor,description:e.target.value})} className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-zinc-400" placeholder="Résumé, source, commentaire, référence juridique..."/></label>{error&&<p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}</div><div className="flex justify-end gap-2 border-t px-5 py-4"><button onClick={()=>setEditor(null)} className="rounded-xl border px-4 py-2 text-sm">Annuler</button><button disabled={saving||!editor.title.trim()} onClick={saveEditor} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{saving?'Enregistrement...':'Enregistrer'}</button></div></div></div>}
  </div>
}
