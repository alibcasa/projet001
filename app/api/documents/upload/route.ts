import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractPdf } from '@/lib/pdf/extract'
import { classifyText } from '@/lib/classification'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file || file.type !== 'application/pdf') return NextResponse.json({ error: 'PDF requis' }, { status: 400 })
  if (file.size > 200 * 1024 * 1024) return NextResponse.json({ error: 'Taille maximale: 200 Mo' }, { status: 400 })

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
  const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`
  const bytes = await file.arrayBuffer()
  const upload = await supabase.storage.from('documents').upload(storagePath, bytes, { contentType: 'application/pdf' })
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 })

  try {
    const extracted = await extractPdf(bytes)
    const classification = classifyText(`${file.name}\n${extracted.text.slice(0, 30000)}`)
    const confidence = classification.categories[0]?.confidence || 0
    const { data: doc, error } = await supabase.from('documents').insert({
      user_id: user.id,
      title: file.name.replace(/\.pdf$/i, ''),
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      total_pages: extracted.pages.length,
      extracted_text: extracted.text,
      classification_confidence: confidence,
    }).select().single()
    if (error) throw error

    if (extracted.pages.length) {
      const { error: pageError } = await supabase.from('document_pages').insert(extracted.pages.map(p => ({ document_id: doc.id, page_number: p.pageNumber, content: p.text })))
      if (pageError) throw pageError
    }

    for (let i = 0; i < classification.categories.length; i++) {
      const c = classification.categories[i]
      const slug = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')
      let { data: category } = await supabase.from('categories').select('id').eq('slug', slug).maybeSingle()
      if (!category) {
        const created = await supabase.from('categories').insert({ name: c.name, slug }).select('id').single()
        category = created.data
      }
      if (category) await supabase.from('document_categories').upsert({ document_id: doc.id, category_id: category.id, is_primary: i === 0, confidence: c.confidence })
    }
    for (const name of classification.tags) {
      let { data: tag } = await supabase.from('tags').select('id').eq('name', name).maybeSingle()
      if (!tag) tag = (await supabase.from('tags').insert({ name }).select('id').single()).data
      if (tag) await supabase.from('document_tags').upsert({ document_id: doc.id, tag_id: tag.id })
    }
    return NextResponse.json({ document: doc, classification }, { status: 201 })
  } catch (error: any) {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json({ error: error?.message || 'Extraction PDF impossible' }, { status: 500 })
  }
}
