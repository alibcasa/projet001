'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookOpen, Brain, CheckCircle2, Clock3, Flame, Gauge, ListChecks, Sparkles } from 'lucide-react'

type Doc={id:string;title:string;total_pages:number;category:string;progress:number;lastPage:number}

export function RevisionSprintClient({documents,flashcards,keynotes,quizCount}:{documents:Doc[];flashcards:number;keynotes:number;quizCount:number}){
  const [days,setDays]=useState(3)
  const ranked=useMemo(()=>[...documents].sort((a,b)=>{
    const score=(d:Doc)=>d.progress<15?100:d.progress<60?75:d.progress<90?50:25
    return score(b)-score(a) || b.total_pages-a.total_pages
  }),[documents])
  const unread=documents.filter(d=>d.progress<15).length
  const ongoing=documents.filter(d=>d.progress>=15&&d.progress<90).length
  const mastered=documents.filter(d=>d.progress>=90).length
  const avg=documents.length?Math.round(documents.reduce((n,d)=>n+d.progress,0)/documents.length):0
  const dailyDocs=Math.max(1,Math.ceil(Math.max(unread+ongoing,1)/Math.max(days,1)))
  const today=ranked.slice(0,Math.min(dailyDocs,6))

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl bg-zinc-950 p-6 text-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300"><Flame className="h-4 w-4"/>Mode révision intensive</div><h1 className="mt-2 text-3xl font-bold tracking-tight">Sprint final de révision</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">RevisionOS priorise automatiquement les documents non lus, puis transforme la lecture en QCM, flashcards et rappels actifs.</p></div>
        <label className="rounded-2xl bg-white/10 p-4 text-sm"><span className="block text-xs text-zinc-300">Jours restants</span><input type="number" min={1} max={60} value={days} onChange={e=>setDays(Math.max(1,Number(e.target.value)||1))} className="mt-1 w-24 rounded-xl bg-white px-3 py-2 text-2xl font-bold text-zinc-950 outline-none"/></label>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[['À commencer',unread],['En cours',ongoing],['Maîtrisés',mastered],['Progression',`${avg}%`]].map(([l,v])=><div key={String(l)} className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-xs text-zinc-400">{l}</div><div className="mt-1 text-2xl font-bold">{v}</div></div>)}
      </div>
    </section>

    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b p-5"><div><h2 className="font-semibold">À réviser maintenant</h2><p className="mt-1 text-xs text-zinc-500">Objectif conseillé : {dailyDocs} document(s) par jour pendant {days} jour(s).</p></div><Gauge className="h-5 w-5 text-zinc-400"/></div>
        <div className="divide-y">
          {today.map((d,i)=><div key={d.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-zinc-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-sm font-bold text-white">{i+1}</div>
            <div className="min-w-[220px] flex-1"><div className="truncate font-medium">{d.title}</div><div className="mt-1 text-xs text-zinc-500">{d.category||'Non classé'} · {d.total_pages||0} pages · {d.progress}% lu</div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100"><div className="h-full bg-zinc-950" style={{width:`${d.progress}%`}}/></div></div>
            <Link href={`/reader/${d.id}`} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-3 py-2 text-sm font-medium text-white"><BookOpen className="h-4 w-4"/>{d.progress?'Continuer':'Lire'}</Link>
          </div>)}
          {!today.length&&<div className="p-8 text-center text-sm text-zinc-500">Importez vos PDF pour générer votre programme.</div>}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold"><Clock3 className="h-5 w-5"/>Routine quotidienne</div><div className="mt-4 space-y-3 text-sm">
          <div className="rounded-xl bg-zinc-50 p-3"><b>1. Lecture active · 45 min</b><p className="mt-1 text-xs text-zinc-500">Lire les documents prioritaires et noter les règles essentielles.</p></div>
          <div className="rounded-xl bg-zinc-50 p-3"><b>2. QCM · 30 min</b><p className="mt-1 text-xs text-zinc-500">Tester immédiatement ce qui vient d'être lu.</p></div>
          <div className="rounded-xl bg-zinc-50 p-3"><b>3. Flashcards · 20 min</b><p className="mt-1 text-xs text-zinc-500">Rappel actif, sans relire la réponse avant de réfléchir.</p></div>
          <div className="rounded-xl bg-zinc-50 p-3"><b>4. Résumé · 15 min</b><p className="mt-1 text-xs text-zinc-500">Écrire les points faibles et les notions à revoir demain.</p></div>
        </div></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center gap-2 font-semibold"><Brain className="h-5 w-5"/>Base de révision</div><div className="mt-4 grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-zinc-50 p-3"><b className="block text-xl">{flashcards}</b><span className="text-[10px] text-zinc-500">Flashcards</span></div><div className="rounded-xl bg-zinc-50 p-3"><b className="block text-xl">{keynotes}</b><span className="text-[10px] text-zinc-500">Notes</span></div><div className="rounded-xl bg-zinc-50 p-3"><b className="block text-xl">{quizCount}</b><span className="text-[10px] text-zinc-500">QCM</span></div></div></div>
      </aside>
    </section>

    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Link href="/library" className="rounded-2xl border bg-white p-5 shadow-sm hover:border-zinc-400"><BookOpen className="h-5 w-5"/><b className="mt-3 block">Lecture</b><p className="mt-1 text-xs text-zinc-500">Continuer les PDF prioritaires.</p></Link>
      <Link href="/qcm" className="rounded-2xl border bg-white p-5 shadow-sm hover:border-zinc-400"><ListChecks className="h-5 w-5"/><b className="mt-3 block">QCM ciblé</b><p className="mt-1 text-xs text-zinc-500">Créer un test à partir d'un ou plusieurs PDF.</p></Link>
      <Link href="/flashcards" className="rounded-2xl border bg-white p-5 shadow-sm hover:border-zinc-400"><Sparkles className="h-5 w-5"/><b className="mt-3 block">Flashcards</b><p className="mt-1 text-xs text-zinc-500">Mémoriser les points difficiles.</p></Link>
      <Link href="/keynotes" className="rounded-2xl border bg-white p-5 shadow-sm hover:border-zinc-400"><CheckCircle2 className="h-5 w-5"/><b className="mt-3 block">Notes & erreurs</b><p className="mt-1 text-xs text-zinc-500">Revoir remarques, résumés et erreurs récurrentes.</p></Link>
    </section>
  </div>
}
