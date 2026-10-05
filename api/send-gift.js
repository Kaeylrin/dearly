/*
 * POST /api/send-gift  { id, token, to, fromName, note }
 *
 * Emails a gift's share link to the recipient through Resend. Only the sender
 * can do this: the gift's edit token has to match. Each gift can be emailed a
 * limited number of times so the endpoint can't be used to spam.
 *
 * Env (Vercel project settings):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *   MAIL_FROM        e.g. "Dearly <gifts@yourdomain.com>" (verified in Resend)
 *   PUBLIC_SITE_URL  optional, e.g. https://dearly.app (defaults to the request host)
 */

const MAX_EMAILS_PER_GIFT = 5
const ID_RE = /^[A-Za-z0-9]{10}$/
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const clean = (v, max) =>
  typeof v === 'string'
    ? v
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, max)
    : ''

function siteUrl(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/+$/, '')
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const proto = req.headers['x-forwarded-proto'] || 'https'
  return `${proto}://${host}`
}

async function db(path, init = {}) {
  const base = process.env.SUPABASE_URL.replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    // New sb_secret_ keys go in `apikey` only; legacy JWT service_role keys also need the Bearer header.
    headers: {
      apikey: key,
      ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }),
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

function emailHtml({ fromName, note, url }) {
  const from = escapeHtml(fromName)
  const line = note ? `<p style="margin:0 0 28px;font-size:17px;line-height:1.6;color:#5c5257;font-style:italic">“${escapeHtml(note)}”</p>` : ''
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f8f3ee">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f3ee;padding:48px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaf6;border:1px solid #eadfd7;border-radius:8px">
        <tr><td style="padding:40px 36px;font-family:Georgia,'Times New Roman',serif;color:#241c22">
          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a7f84">Dearly</p>
          <h1 style="margin:0 0 20px;font-size:30px;line-height:1.15;font-weight:600">${from} made you <em style="color:#b5473f;background:#f2ddd8;padding:0 4px">something.</em></h1>
          ${line}
          <a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;background:#b5473f;color:#fff8f5;border-radius:999px;font-family:Arial,sans-serif;font-size:15px;font-weight:600;text-decoration:none">Open it</a>
          <p style="margin:28px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#8a7f84">Or paste this into your browser:<br><a href="${escapeHtml(url)}" style="color:#b5473f;word-break:break-all">${escapeHtml(url)}</a></p>
        </td></tr>
      </table>
      <p style="margin:20px 0 0;font-family:Arial,sans-serif;font-size:12px;color:#8a7f84">Sent with Dearly because ${from} wanted you to have this.</p>
    </td></tr>
  </table>
</body></html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'MAIL_FROM'].filter((k) => !process.env[k])
  if (missing.length) {
    console.error('send-gift: missing env', missing)
    return res.status(500).json({ error: 'Email isn’t set up yet. Copy the link and send it yourself for now.' })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const id = clean(body.id, 10)
  const token = clean(body.token, 36)
  const to = clean(body.to, 254).toLowerCase()
  const fromName = clean(body.fromName, 60)
  const note = clean(body.note, 200)

  if (!ID_RE.test(id) || !TOKEN_RE.test(token)) return res.status(400).json({ error: 'This gift couldn’t be found.' })
  if (!EMAIL_RE.test(to)) return res.status(400).json({ error: 'That email address doesn’t look right.' })
  if (!fromName) return res.status(400).json({ error: 'Add your name so she knows who it’s from.' })

  try {
    const rows = await db(`gifts?id=eq.${id}&edit_token=eq.${token}&select=id,type,email_count`)
    const gift = rows?.[0]
    if (!gift) return res.status(404).json({ error: 'This gift couldn’t be found.' })
    if (gift.email_count >= MAX_EMAILS_PER_GIFT) {
      return res.status(429).json({ error: 'This gift has been emailed a few times already. Copy the link and send it yourself.' })
    }

    const url = `${siteUrl(req)}/${gift.type}/${gift.id}`
    const subject = `${fromName} made you something`
    const text = `${fromName} made you something on Dearly.${note ? `\n\n“${note}”` : ''}\n\nOpen it: ${url}\n`

    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html: emailHtml({ fromName, note, url }), text }),
    })
    if (!sent.ok) {
      console.error('send-gift: resend', sent.status, await sent.text())
      return res.status(502).json({ error: 'The email couldn’t be sent. Please try again in a moment.' })
    }

    await db(`gifts?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ recipient_email: to, emailed_at: new Date().toISOString(), email_count: gift.email_count + 1 }),
    })
    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('send-gift', err)
    return res.status(500).json({ error: 'Something went wrong sending the email. Please try again.' })
  }
}
