import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractPdf } from '@/lib/pdf/extract'
import { classifyDocument } from '@/lib/classification'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file || file.type !== 'application/pdf') return NextResponse.json({ error: 'PDF requis' }, { status: 400 })
  if (file.size > 200 * 1024 * 1024) return NextResponse.json({ error: 'Taille maximale: 200 Mo' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
  const bytes = await file.arrayBuffer()
  const upload = await supabase.storage.from('documents').upload(path, bytes, { contentType: 'application/pdf' })
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 })

  try {
    const extracted = await extractPdf(bytes)
    const classification = classifyDocument(`${file.name}\n${extracted.text.slice(0, 30000)}`)
    const { data: doc, error } = await supabase.from('documents').insert({
      user_id: user.id,
      title: file.name.replace(/\.pdf$/i, ''),
      storage_path: path,
      mime_type: file.type,
      file_size: file.size,
      total_pages: extracted.pages.length,
      extracted_text: extracted.text,
      classification_confidence: classification.score,
    }).select().single()
    if (error) throw error
    if (extracted.pages.length) {
      await supabase.from('document_pages').insert(extracted.pages.map(p => ({ document_id: doc.id, page_number: p.pageNumber, content: p.text })))
    }
    return NextResponse.json({ document: doc, classification }, { status: 201 })
  } catch (error: any) {
    await supabase.storage.from('documents').remove([path])
    return NextResponse.json({ error: error?.message || 'Extraction PDF impossible' }, { status: 500 })
  }
}
