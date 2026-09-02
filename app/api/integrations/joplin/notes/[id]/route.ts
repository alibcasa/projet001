import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joplinRequest } from '@/lib/joplin'

async function config() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('integrations').select('enabled,config').eq('user_id', user.id).eq('provider', 'joplin').maybeSingle()
  const c = (data?.config || {}) as { baseUrl?:string; token?:string }
  return data?.enabled && c.baseUrl && c.token ? c : null
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id:string }> }) {
  const c = await config()
  if (!c) return NextResponse.json({ error: 'Joplin non connecté' }, { status: 409 })
  const { id } = await params
  const body = await request.json()
  try {
    const updated = await joplinRequest(c.baseUrl!, c.token!, `/notes/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify({ title: body.title, body: body.body }) })
    return NextResponse.json(updated || { ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Modification impossible' }, { status: 502 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id:string }> }) {
  const c = await config()
  if (!c) return NextResponse.json({ error: 'Joplin non connecté' }, { status: 409 })
  const { id } = await params
  try {
    await joplinRequest(c.baseUrl!, c.token!, `/notes/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return NextResponse.json({ ok: true })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Suppression impossible' }, { status: 502 })
  }
}
