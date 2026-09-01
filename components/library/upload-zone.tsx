'use client'

import { useRef, useState } from 'react'
import { Upload, Loader2 } from 'lucide-react'

export function UploadZone({ onDone }: { onDone?: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); setMessage('')
    let ok = 0
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append('file', file)
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd })
      if (res.ok) ok++
      else { const data = await res.json().catch(()=>({})); setMessage(data.error || `Erreur: ${file.name}`) }
    }
    setBusy(false)
    if (ok) setMessage(`${ok} PDF importé${ok > 1 ? 's' : ''} avec succès.`)
    onDone?.()
  }

  return <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault(); upload(e.dataTransfer.files)}} className="rounded-2xl border-2 border-dashed bg-white p-6 text-center">
    <input ref={input} className="hidden" type="file" accept="application/pdf" multiple onChange={e=>upload(e.target.files)} />
    <Upload className="mx-auto mb-3" />
    <p className="font-medium">Glissez vos PDF ici</p><p className="text-sm text-zinc-500">Import unitaire ou par lot · 200 Mo maximum par fichier</p>
    <button disabled={busy} onClick={()=>input.current?.click()} className="mt-4 rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50">{busy ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Import...</span> : 'Choisir des PDF'}</button>
    {message && <p className="mt-3 text-sm">{message}</p>}
  </div>
}
