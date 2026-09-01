import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const documentId = new URL(request.url).searchParams.get('document_id')
  let q = supabase.from('keynotes').select('*').order('created_at', { ascending: false })
  if (documentId) q = q.eq('document_id', documentId)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { data, error } = await supabase.from('keynotes').insert({ ...body, user_id: user.id }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data, { status: 201 })
}
