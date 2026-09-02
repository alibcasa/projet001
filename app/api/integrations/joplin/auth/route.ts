import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { discoverJoplin, joplinAuthCheck, joplinAuthStart, joplinRequest } from '@/lib/joplin'

async function currentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function POST() {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const baseUrl = await discoverJoplin()
  if (!baseUrl) return NextResponse.json({ error: 'Joplin ne répond pas. Ouvrez Joplin puis activez Outils > Options > Web Clipper.' }, { status: 503 })
  try {
    const { auth_token } = await joplinAuthStart(baseUrl)
    const { error } = await supabase.from('integrations').upsert({
      user_id: user.id,
      provider: 'joplin',
      enabled: false,
      config: { baseUrl, authToken: auth_token },
    }, { onConflict: 'user_id,provider' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ status: 'waiting', baseUrl })
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Autorisation Joplin impossible' }, { status: 502 })
  }
}

export async function GET() {
  const { supabase, user } = await currentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase.from('integrations').select('enabled,config').eq('user_id', user.id).eq('provider', 'joplin').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const config = (data?.config || {}) as { baseUrl?:string; authToken?:string; token?:string }

  if (data?.enabled && config.baseUrl && config.token) {
    try {
      await joplinRequest(config.baseUrl, config.token, '/folders?fields=id&limit=1')
      return NextResponse.json({ status: 'connected', baseUrl: config.baseUrl })
    } catch {
      const discovered = await discoverJoplin()
      if (discovered && discovered !== config.baseUrl) {
        try {
          await joplinRequest(discovered, config.token, '/folders?fields=id&limit=1')
          await supabase.from('integrations').update({ config: { baseUrl: discovered, token: config.token }, enabled: true }).eq('user_id', user.id).eq('provider', 'joplin')
          return NextResponse.json({ status: 'connected', baseUrl: discovered })
        } catch {}
      }
      await supabase.from('integrations').update({ enabled: false }).eq('user_id', user.id).eq('provider', 'joplin')
      return NextResponse.json({ status: 'offline', error: 'Joplin ou Web Clipper ne répond plus. Ouvrez Joplin puis reconnectez.' })
    }
  }

  if (!config.baseUrl || !config.authToken) return NextResponse.json({ status: 'disconnected' })
  try {
    const result = await joplinAuthCheck(config.baseUrl, config.authToken)
    if (result.status === 'accepted' && result.token) {
      await supabase.from('integrations').update({ enabled: true, config: { baseUrl: config.baseUrl, token: result.token } }).eq('user_id', user.id).eq('provider', 'joplin')
      return NextResponse.json({ status: 'connected', baseUrl: config.baseUrl })
    }
    if (result.status === 'rejected') {
      await supabase.from('integrations').update({ enabled: false, config: { baseUrl: config.baseUrl } }).eq('user_id', user.id).eq('provider', 'joplin')
    }
    return NextResponse.json({ status: result.status, baseUrl: config.baseUrl })
  } catch (e:any) {
    return NextResponse.json({ status: 'offline', error: e?.message || 'Joplin indisponible' })
  }
}
