import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { document_id, page, total_pages, seconds = 0 } = await request.json()
  const { data: current } = await supabase.from('reading_progress').select('*').eq('user_id', user.id).eq('document_id', document_id).maybeSingle()
  const pages = Array.from(new Set([...(current?.pages_viewed || []), Number(page)])).sort((a,b)=>a-b)
  const completion = total_pages ? Math.min(100, Math.round((pages.length / total_pages) * 100)) : 0
  const payload = {
    user_id: user.id, document_id, last_page: page, highest_page: Math.max(current?.highest_page || 0, page),
    total_pages, pages_viewed: pages, completion_percent: completion,
    reading_seconds: (current?.reading_seconds || 0) + Number(seconds || 0), last_read_at: new Date().toISOString(),
    completed_at: completion >= 100 ? new Date().toISOString() : current?.completed_at || null,
  }
  const { data, error } = await supabase.from('reading_progress').upsert(payload, { onConflict: 'user_id,document_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
