import { JoplinNotesWorkspace } from '@/components/joplin/joplin-notes-workspace'

export default function NotesPage(){
  return <div className="space-y-5"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Lecture & connaissance</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Notes de lecture</h1><p className="mt-2 text-sm text-zinc-500">Remarques, résumés et synthèses synchronisés avec Joplin.</p></div><JoplinNotesWorkspace/></div>
}
