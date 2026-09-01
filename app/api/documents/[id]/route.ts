import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single()
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
  const body = await request.json()
  const { data, error } = await supabase.from('documents').update({ ...body, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('documents').select('storage_path').eq('id', id).single()
  if (data?.storage_path) await supabase.storage.from('documents').remove([data.storage_path])
  const { error } = await supabase.from('documents').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
