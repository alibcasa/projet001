import { createClient } from '@/lib/supabase/server'
import { paperlessStatus } from '@/lib/paperless'

export default async function Integrations(){
  const s=await createClient()
  const{data}=await s.from('integrations').select('provider,enabled')
  const active=new Set((data||[]).filter((x:any)=>x.enabled).map((x:any)=>x.provider))
  const paperless=await paperlessStatus()
  const cards=[
    {n:'Paperless-ngx',d:'OCR, indexation plein texte, catégories, détection du titre et classement des PDF.',p:'paperless',href:paperless.url.replace('127.0.0.1','localhost'),state:paperless.ok?'Connecté':'Hors ligne'},
    {n:'Joplin',d:'Carnets, remarques et résumés de lecture synchronisés avec le lecteur PDF.',p:'joplin',href:'/notes',state:active.has('joplin')?'Connecté':'À connecter'},
    {n:'Google Workspace',d:'Drive, Docs, Sheets et Calendar',p:'google',href:'/api/integrations/google/connect',state:active.has('google')?'Connecté':'À configurer'},
    {n:'Microsoft 365',d:'OneDrive, SharePoint et Excel',p:'microsoft',href:'/api/integrations/microsoft/connect',state:active.has('microsoft')?'Connecté':'À configurer'},
    {n:'OpenProject',d:'Projets, work packages, jalons et temps',p:'openproject',href:'/projects',state:'Local'},
    {n:'Hypothesis',d:'Annotations open source compatibles PDF/Web',p:'hypothesis',href:'/keynotes',state:active.has('hypothesis')?'Connecté':'Optionnel'},
  ]
  return <div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Écosystème RevisionOS</p><h1 className="mt-1 text-3xl font-bold">Intégrations</h1><p className="mt-2 text-zinc-500">Moteurs documentaires, notes, projets et cloud.</p></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(c=><div key={c.p} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{c.n}</h2><p className="mt-2 text-sm leading-6 text-zinc-600">{c.d}</p></div><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${c.state==='Connecté'?'bg-green-100 text-green-700':c.state==='Hors ligne'?'bg-red-50 text-red-700':'bg-zinc-100 text-zinc-600'}`}>{c.state}</span></div><a href={c.href} target={c.p==='paperless'?'_blank':undefined} rel={c.p==='paperless'?'noreferrer':undefined} className="mt-5 inline-block rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50">{c.p==='google'||c.p==='microsoft'?'Connecter':'Ouvrir'}</a></div>)}</div></div>
}
