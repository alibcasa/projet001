export type JoplinConfig = { baseUrl: string; token?: string; authToken?: string }

export async function discoverJoplin() {
  const configured = process.env.JOPLIN_BASE_URL?.replace(/\/$/, '')
  const defaults = Array.from({ length: 11 }, (_, i) => `http://127.0.0.1:${41184 + i}`)
  const candidates = Array.from(new Set([...(configured ? [configured] : []), ...defaults]))
  for (const baseUrl of candidates) {
    try {
      const r = await fetch(`${baseUrl}/ping`, { cache: 'no-store', signal: AbortSignal.timeout(1200) })
      if (r.ok && (await r.text()).includes('JoplinClipperServer')) return baseUrl
    } catch {}
  }
  return null
}

export async function joplinAuthStart(baseUrl: string) {
  const r = await fetch(`${baseUrl}/auth`, { method: 'POST', cache: 'no-store' })
  if (!r.ok) throw new Error(`Joplin auth ${r.status}`)
  return r.json() as Promise<{auth_token:string}>
}

export async function joplinAuthCheck(baseUrl: string, authToken: string) {
  const r = await fetch(`${baseUrl}/auth/check?auth_token=${encodeURIComponent(authToken)}`, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Joplin auth/check ${r.status}`)
  return r.json() as Promise<{status:'waiting'|'accepted'|'rejected';token?:string}>
}

export async function joplinRequest(baseUrl: string, token: string, path: string, init: RequestInit = {}) {
  const join = path.includes('?') ? '&' : '?'
  const r = await fetch(`${baseUrl}${path}${join}token=${encodeURIComponent(token)}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    cache: 'no-store',
    signal: init.signal || AbortSignal.timeout(5000),
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Joplin ${r.status}: ${text || r.statusText}`)
  }
  if (r.status === 204) return null
  const type = r.headers.get('content-type') || ''
  return type.includes('application/json') ? r.json() : r.text()
}
