import { Suspense } from 'react'
import { LibraryClient } from '@/components/library/library-client'

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl border bg-white p-8 text-sm text-zinc-500">Chargement de la bibliothèque...</div>}>
      <LibraryClient />
    </Suspense>
  )
}
