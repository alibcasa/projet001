import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractPdf } from '@/lib/pdf/extract'
import { classifyText } from '@/lib/classification'
import { extractDocumentMetadata } from '@/lib/ai/provider'

export const runtime = 'nodejs'
export const maxDuration = 120

function slug(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,120)}
function safePdfName(title:string){const cleaned=title.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,150);return `${cleaned||'document'}.pdf`}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const form = await request.formData()
  const file = form.get('file') as File | null
  if (!file || file.type !== 'application/pdf') return NextResponse.json({ error: 'PDF requis' }, { status: 400 })
  if (file.size > 200 * 1024 * 1024) return NextResponse.json({ error: 'Taille maximale: 200 Mo' }, { status: 400 })

  const originalTitle = file.name.replace(/\.pdf$/i, '').trim()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_')
  let storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`
  const bytes = await file.arrayBuffer()
  const upload = await supabase.storage.from('documents').upload(storagePath, bytes, { contentType: 'application/pdf' })
  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 })

  try {
    const extracted = await extractPdf(bytes)
    const classification = classifyText(`${file.name}\n${extracted.text.slice(0, 30000)}`)
    let metadata: Awaited<ReturnType<typeof extractDocumentMetadata>> | null = null
    if (extracted.text.trim().length >= 120) {
      try { metadata = await extractDocumentMetadata(file.name, extracted.text) } catch { metadata = null }
    }

    const aiTitle = metadata?.title?.trim() || ''
    const useAiTitle = aiTitle.length >= 5 && (metadata?.confidence || 0) >= 0.45
    const title = useAiTitle ? aiTitle : originalTitle

    if (useAiTitle) {
      const renamedPath = `${user.id}/${safePdfName(title)}`
      if (renamedPath !== storagePath) {
        const exists = await supabase.storage.from('documents').list(user.id, { search: safePdfName(title), limit: 10 })
        const finalPath = exists.data?.some(x=>x.name===safePdfName(title))
          ? `${user.id}/${title.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,130)}-${crypto.randomUUID().slice(0,8)}.pdf`
          : renamedPath
        const moved = await supabase.storage.from('documents').move(storagePath, finalPath)
        if (!moved.error) storagePath = finalPath
      }
    }

    const categories = [...classification.categories]
    if (metadata?.category) {
      const existingIndex = categories.findIndex(c => c.name.toLowerCase() === metadata!.category!.toLowerCase())
      if (existingIndex >= 0) categories.splice(existingIndex, 1)
      categories.unshift({ name: metadata.category, confidence: Math.round((metadata.confidence || 0.8) * 100) / 100 })
    }
    const confidence = Math.max(categories[0]?.confidence || 0, metadata?.confidence || 0)
    const allTags = Array.from(new Set([...(metadata?.tags || []), ...classification.tags])).slice(0,20)

    const descriptionParts = [metadata?.documentType, metadata?.institution, metadata?.year ? String(metadata.year) : ''].filter(Boolean)
    const { data: doc, error } = await supabase.from('documents').insert({
      user_id: user.id,
      title,
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      total_pages: extracted.pages.length,
      language: metadata?.language || null,
      description: descriptionParts.length ? descriptionParts.join(' · ') : null,
      extracted_text: extracted.text,
      classification_confidence: confidence,
      source_type: useAiTitle ? `upload:${file.name}` : 'upload',
    }).select().single()
    if (error) throw error

    if (extracted.pages.length) {
      const { error: pageError } = await supabase.from('document_pages').insert(extracted.pages.map(p => ({ document_id: doc.id, page_number: p.pageNumber, content: p.text })))
      if (pageError) throw pageError
    }

    for (let i = 0; i < categories.length; i++) {
      const c = categories[i]
      const categorySlug = slug(c.name)
      let { data: category } = await supabase.from('categories').select('id').eq('slug', categorySlug).maybeSingle()
      if (!category) {
        const created = await supabase.from('categories').insert({ name: c.name, slug: categorySlug }).select('id').single()
        category = created.data
      }
      if (category) await supabase.from('document_categories').upsert({ document_id: doc.id, category_id: category.id, is_primary: i === 0, confidence: c.confidence })
    }
    for (const name of allTags) {
      let { data: tag } = await supabase.from('tags').select('id').eq('name', name).maybeSingle()
      if (!tag) tag = (await supabase.from('tags').insert({ name }).select('id').single()).data
      if (tag) await supabase.from('document_tags').upsert({ document_id: doc.id, tag_id: tag.id })
    }
    return NextResponse.json({ document: doc, classification: { ...classification, categories, tags: allTags }, metadata, renamed: useAiTitle, originalName: file.name }, { status: 201 })
  } catch (error: any) {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json({ error: error?.message || 'Extraction PDF impossible' }, { status: 500 })
  }
}
