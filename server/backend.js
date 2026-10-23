export const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

export async function db(path, init = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.SUPABASE_URL || !key) throw new Error('Backend not configured')
  const res = await fetch(`${process.env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const error = new Error('Database request failed')
    error.code = body.code
    throw error
  }
  return res.status === 204 ? null : res.json()
}

export const rpc = (name, args) => db(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })
export const trustedIp = (req) => req.headers.get('x-real-ip') || null
export const sameOrigin = (req) => !req.headers.get('origin') || req.headers.get('origin') === new URL(req.url).origin || req.headers.get('origin') === process.env.PUBLIC_SITE_URL
