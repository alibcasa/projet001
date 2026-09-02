import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safePdfName(title:string){const cleaned=title.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,150);return `${cleaned||'document'}.pdf`}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('documents').select('*, document_categories(category_id,is_primary,categories(id,name,slug,parent_id)), document_tags(tags(id,name))').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  let signedUrl: string | null = null
  if (data.storage_path) {
    const signed = await supabase.storage.from('documents').createSignedUrl(data.storage_path, 3600)
    signedUrl = signed.data?.signedUrl ?? null
  }
  return NextResponse.json({ ...data, signedUrl })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: owned } = await supabase.from('documents').select('id,title,storage_path').eq('id', id).eq('user_id', user.id).maybeSingle()
  if (!owned) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })

  const body = await request.json()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return NextResponse.json({ error: 'Le nom du PDF est obligatoire' }, { status: 400 })
    updates.title = title
    if (owned.storage_path && title !== owned.title) {
      const targetName=safePdfName(title)
      const list=await supabase.storage.from('documents').list(user.id,{search:targetName,limit:10})
      const targetPath=list.data?.some(x=>x.name===targetName)?`${user.id}/${title.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim().slice(0,130)}-${crypto.randomUUID().slice(0,8)}.pdf`:`${user.id}/${targetName}`
      const moved=await supabase.storage.from('documents').move(owned.storage_path,targetPath)
      if (!moved.error) updates.storage_path=targetPath
    }
  }
  if (body.description !== undefined) updates.description = String(body.description || '').trim() || null
  if (body.language !== undefined) updates.language = String(body.language || '').trim() || null
  if (body.is_public !== undefined) updates.is_public = Boolean(body.is_public)

  const { data, error } = await supabase.from('documents').update(updates).eq('id', id).eq('user_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  if (body.category_id !== undefined) {
    const { error: deleteError } = await supabase.from('document_categories').delete().eq('document_id', id)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })
    if (body.category_id) {
      const { error: categoryError } = await supabase.from('document_categories').insert({
        document_id: id,
        category_id: body.category_id,
        is_primary: true,
        confidence: 100,
      })
      if (categoryError) return NextResponse.json({ error: categoryError.message }, { status: 400 })
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data } = await supabase.from('documents').select('storage_path').eq('id', id).eq('user_id', user.id).single()
  if (!data) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 })
  if (data.storage_path) await supabase.storage.from('documents').remove([data.storage_path])
  const { error } = await supabase.from('documents').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
