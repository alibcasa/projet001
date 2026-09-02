'use client'

import { useEffect, useRef, useState } from 'react'
import { FolderOpen, Loader2, Upload } from 'lucide-react'

type UploadEntry = { file: File; relativePath: string }

type DirectoryHandle = {
  name: string
  kind: 'directory'
  values: () => AsyncIterableIterator<any>
}

export function UploadZone({ onDone }: { onDone?: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' })

  useEffect(() => {
    folderInput.current?.setAttribute('webkitdirectory', '')
    folderInput.current?.setAttribute('directory', '')
  }, [])

  function entriesFromFileList(files: FileList | null): UploadEntry[] {
    if (!files?.length) return []
    return Array.from(files)
      .filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
      .map(file => ({
        file,
        relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
      }))
  }

  async function scanDirectory(handle: DirectoryHandle, prefix = ''): Promise<UploadEntry[]> {
    const entries: UploadEntry[] = []
    for await (const child of handle.values()) {
      const path = prefix ? `${prefix}/${child.name}` : child.name
      if (child.kind === 'directory') {
        entries.push(...await scanDirectory(child as DirectoryHandle, path))
      } else if (child.kind === 'file' && child.name.toLowerCase().endsWith('.pdf')) {
        const file = await child.getFile()
        entries.push({ file, relativePath: path })
      }
    }
    return entries
  }

  async function chooseFolder() {
    if (busy) return
    setMessage('')
    try {
      const picker = (window as any).showDirectoryPicker
      if (typeof picker === 'function') {
        const handle = await picker({ mode: 'read' }) as DirectoryHandle
        setBusy(true)
        setProgress({ done: 0, total: 0, current: `Analyse du dossier ${handle.name}...` })
        const entries = await scanDirectory(handle, handle.name)
        setBusy(false)
        if (!entries.length) {
          setMessage(`Aucun PDF trouvé dans « ${handle.name} » ni dans ses sous-dossiers.`)
          return
        }
        await uploadEntries(entries)
        return
      }
      folderInput.current?.click()
    } catch (error: any) {
      setBusy(false)
      if (error?.name !== 'AbortError') setMessage(`Impossible de parcourir le dossier : ${error?.message || 'erreur inconnue'}`)
    }
  }

  async function uploadEntries(entries: UploadEntry[]) {
    const pdfs = entries.filter(x => x.file.type === 'application/pdf' || x.file.name.toLowerCase().endsWith('.pdf'))
    if (!pdfs.length) { setMessage('Aucun PDF trouvé dans la sélection.'); return }

    setBusy(true)
    setMessage('')
    setProgress({ done: 0, total: pdfs.length, current: '' })
    let ok = 0
    const errors: string[] = []

    for (let index = 0; index < pdfs.length; index++) {
      const { file, relativePath } = pdfs[index]
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
      : `${ok} PDF importé${ok > 1 ? 's' : ''} avec succès.`)
    onDone?.()
  }

  async function uploadFileList(files: FileList | null) {
    await uploadEntries(entriesFromFileList(files))
  }

  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); uploadFileList(e.dataTransfer.files)}} className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-6 shadow-sm">
    <input ref={fileInput} className="hidden" type="file" accept="application/pdf,.pdf" multiple onChange={e=>uploadFileList(e.target.files)} />
    <input ref={folderInput} className="hidden" type="file" accept="application/pdf,.pdf" multiple onChange={e=>uploadFileList(e.target.files)} />
    <div className="flex flex-col items-center text-center">
      <div className="mb-3 rounded-2xl bg-zinc-100 p-3"><Upload className="h-6 w-6" /></div>
      <p className="font-semibold text-zinc-950">Importer votre bibliothèque PDF</p>
      <p className="mt-1 max-w-2xl text-sm text-zinc-500">Sélectionnez directement le dossier parent. RevisionOS parcourt automatiquement tous ses sous-dossiers et importe uniquement les PDF.</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button disabled={busy} onClick={()=>fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"><Upload className="h-4 w-4"/>Choisir des PDF</button>
        <button disabled={busy} onClick={chooseFolder} className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 disabled:opacity-50"><FolderOpen className="h-4 w-4"/>Choisir le dossier parent</button>
      </div>
    </div>
    {busy && <div className="mx-auto mt-5 max-w-2xl rounded-xl bg-zinc-50 p-3">
      <div className="flex items-center justify-between gap-3 text-xs text-zinc-600"><span className="flex min-w-0 items-center gap-2"><Loader2 className="h-4 w-4 shrink-0 animate-spin"/><span className="truncate">{progress.current || 'Préparation...'}</span></span><b>{progress.total ? `${progress.done}/${progress.total}` : 'Analyse...'}</b></div>
      {progress.total > 0 && <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full bg-zinc-950 transition-all" style={{width:`${percent}%`}}/></div>}
    </div>}
    {message && <p className="mt-4 text-center text-sm text-zinc-700">{message}</p>}
  </div>
}
