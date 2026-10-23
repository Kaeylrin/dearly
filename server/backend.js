export const json = (status, body, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } })

export async function db(path, init = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!process.env.SUPABASE_URL || !key) throw new Error('Backend not configured')
  const res = await fetch(`${process.env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/${path}`, {
    ...init,
    signal: AbortSignal.timeout(10000),
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
export function sameOrigin(req) {
  const origin = req.headers.get('origin')
  if (!origin || origin === new URL(req.url).origin) return true
  try { return origin === new URL(process.env.PUBLIC_SITE_URL).origin } catch { return false }
}
