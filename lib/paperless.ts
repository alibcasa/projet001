const DEFAULT_URL = 'http://127.0.0.1:8010'

export function paperlessUrl() {
  return (process.env.PAPERLESS_URL || DEFAULT_URL).replace(/\/$/, '')
}

export function paperlessHeaders(extra: Record<string,string> = {}) {
  const token = process.env.PAPERLESS_API_TOKEN
  return {
    Accept: 'application/json; version=10',
    ...(token ? { Authorization: `Token ${token}` } : {}),
    ...extra,
  }
}

export async function paperlessRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${paperlessUrl()}${path}`, {
    ...init,
    headers: { ...paperlessHeaders(), ...(init.headers || {}) },
    cache: 'no-store',
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Paperless ${response.status}: ${text || response.statusText}`)
  }
  const type = response.headers.get('content-type') || ''
  return type.includes('application/json') ? response.json() : response.text()
}

export async function paperlessStatus() {
  try {
    const data = await paperlessRequest('/api/documents/?page_size=1')
    return { ok: true, count: Number(data?.count || 0), url: paperlessUrl() }
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Paperless indisponible', url: paperlessUrl() }
  }
}

export async function paperlessDocuments(search = '') {
  const params = new URLSearchParams({ page_size: '50', ordering: '-created' })
  if (search.trim()) params.set('text', search.trim())
  return paperlessRequest(`/api/documents/?${params}`)
}

export async function paperlessUpload(file: File, title?: string) {
  const body = new FormData()
  body.set('document', file)
  if (title) body.set('title', title)
  return paperlessRequest('/api/documents/post_document/', { method: 'POST', body })
}
