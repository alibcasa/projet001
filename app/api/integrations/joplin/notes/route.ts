import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { joplinRequest } from '@/lib/joplin'

async function getConfig() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data } = await supabase.from('integrations').select('enabled,config').eq('user_id', user.id).eq('provider', 'joplin').maybeSingle()
  const config = (data?.config || {}) as { baseUrl?:string; token?:string }
  if (!data?.enabled || !config.baseUrl || !config.token) return { error: NextResponse.json({ error: 'Joplin non connecté' }, { status: 409 }) }
  return { supabase, user, baseUrl: config.baseUrl, token: config.token }
}

async function revisionNotebook(baseUrl:string, token:string) {
  const found = await joplinRequest(baseUrl, token, '/search?query=RevisionOS%20Lecture&type=folder&fields=id,title&limit=10')
  const exact = found?.items?.find((x:any) => x.title === 'RevisionOS Lecture')
  if (exact?.id) return exact.id as string
  const created = await joplinRequest(baseUrl, token, '/folders', { method: 'POST', body: JSON.stringify({ title: 'RevisionOS Lecture' }) })
  return created.id as string
}

export async function GET(request: Request) {
  const cfg = await getConfig()
  if ('error' in cfg) return cfg.error
  const url = new URL(request.url)
  const query = url.searchParams.get('q')?.trim()
  try {
    const path = query
      ? `/search?query=${encodeURIComponent(query)}&type=note&fields=id,parent_id,title,body,updated_time&limit=50`
      : '/notes?order_by=updated_time&order_dir=DESC&fields=id,parent_id,title,body,updated_time&limit=50'
    return NextResponse.json(await joplinRequest(cfg.baseUrl!, cfg.token!, path))
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Lecture Joplin impossible' }, { status: 502 })
  }
}

export async function POST(request: Request) {
  const cfg = await getConfig()
  if ('error' in cfg) return cfg.error
  const body = await request.json()
  if (!body?.title?.trim()) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })
  try {
    const parentId = body.parent_id || await revisionNotebook(cfg.baseUrl!, cfg.token!)
    const note = await joplinRequest(cfg.baseUrl!, cfg.token!, '/notes', {
      method: 'POST',
      body: JSON.stringify({
        parent_id: parentId,
        title: body.title.trim(),
        body: body.body || '',
        source_url: body.source_url || '',
        source_application: 'RevisionOS',
      }),
    })
    return NextResponse.json(note, { status: 201 })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Création Joplin impossible' }, { status: 502 })
  }
}
