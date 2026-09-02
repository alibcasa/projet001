'use client'

import { useEffect, useRef, useState } from 'react'
import { FolderOpen, Loader2, Upload } from 'lucide-react'

export function UploadZone({ onDone }: { onDone?: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' })

  useEffect(() => {
    // Chrome/Edge supportent nativement webkitdirectory pour sélectionner un dossier complet.
    folderInput.current?.setAttribute('webkitdirectory', '')
    folderInput.current?.setAttribute('directory', '')
  }, [])

  async function upload(files: FileList | null) {
    if (!files?.length) return
    const pdfs = Array.from(files).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) { setMessage('Aucun PDF trouvé dans la sélection.'); return }

    setBusy(true)
    setMessage('')
    setProgress({ done: 0, total: pdfs.length, current: '' })
    let ok = 0
    const errors: string[] = []

    for (let index = 0; index < pdfs.length; index++) {
      const file = pdfs[index]
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
      setProgress({ done: index, total: pdfs.length, current: relativePath })
      const fd = new FormData()
      fd.append('file', file)
      fd.append('relativePath', relativePath)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (res.ok) ok++
      else {
        const data = await res.json().catch(() => ({}))
        errors.push(`${relativePath}: ${data.error || 'erreur inconnue'}`)
      }
      setProgress({ done: index + 1, total: pdfs.length, current: relativePath })
    }

    setBusy(false)
    setMessage(errors.length
      ? `${ok}/${pdfs.length} PDF importés. ${errors.length} erreur(s). Première erreur : ${errors[0]}`
      : `${ok} PDF importé${ok > 1 ? 's' : ''} avec succès depuis la sélection.`)
    onDone?.()
  }

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); upload(e.dataTransfer.files)}} className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-sm">
    <input ref={fileInput} className="hidden" type="file" accept="application/pdf,.pdf" multiple onChange={e=>upload(e.target.files)} />
    <input ref={folderInput} className="hidden" type="file" accept="application/pdf,.pdf" multiple onChange={e=>upload(e.target.files)} />
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 rounded-2xl bg-zinc-100 p-3"><Upload className="h-6 w-6" /></div>
      <p className="font-semibold text-zinc-950">Importer votre bibliothèque PDF</p>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">Sélectionnez des PDF ou un dossier complet. RevisionOS parcourt les sous-dossiers, ignore les autres fichiers et traite chaque PDF automatiquement.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button disabled={busy} onClick={()=>fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Upload className="h-4 w-4"/>Choisir des PDF</button>
        <button disabled={busy} onClick={()=>folderInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-50"><FolderOpen className="h-4 w-4"/>Choisir un dossier</button>
      </div>
    </div>
    {busy && <div className="mx-auto mt-5 max-w-2xl rounded-xl bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-600"><span className="flex min-w-0 items-center gap-2"><Loader2 className="h-4 w-4 shrink-0 animate-spin"/><span className="truncate">{progress.current || 'Préparation...'}</span></span><b>{progress.done}/{progress.total}</b></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full bg-zinc-950 transition-all" style={{width:`${percent}%`}}/></div>
    </div>}
    {message && <p className="mt-4 text-center text-sm text-zinc-700">{message}</p>}
  </div>
}
