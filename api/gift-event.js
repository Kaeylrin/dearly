import { json, rpc, sameOrigin, trustedIp } from '../server/backend.js'
import { deliverOpenedNotices } from '../server/notifications.js'

export async function POST(req) {
  if (!sameOrigin(req)) return json(403, { error: 'Not allowed.' })
  try {
    const raw = await req.text()
    if (raw.length > 4096) return json(413, { error: 'Message is too long.' })
    let body
    try { body = JSON.parse(raw) } catch { return json(400, { error: 'Bad request.' }) }
    if (!body || !/^[A-Za-z0-9]{10}$/.test(body.id) || !['open', 'reply'].includes(body.action)) return json(400, { error: 'Invalid gift or action.' })
    if (body.action === 'reply' && (typeof body.message !== 'string' || !body.message.trim() || body.message.length > 500)) return json(400, { error: 'Write up to 500 characters.' })
    const ok = await rpc('record_gift_event', { p_id: body.id, p_action: body.action, p_message: body.action === 'reply' ? body.message.trim() : '', p_ip: trustedIp(req) })
    if (!ok) return json(404, { error: 'This gift is locked, missing, or replies are turned off.' })
    if (body.action === 'open') {
      try { await deliverOpenedNotices(body.id) } catch { console.error('Opened notice remains queued') }
    }
    return json(200, { ok: true })
  } catch (err) {
    return json(err.code === 'P0429' ? 429 : 503, { error: err.code === 'P0429' ? 'Please wait before sending again.' : 'Could not reach Dearly. Please try again.' })
  }
}
