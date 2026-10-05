/*
 * POST /api/send-gift  { id, token, to, fromName, note }
 *
 * Emails a gift's share link to the recipient, through Resend when a verified
 * domain is configured, otherwise through a Gmail account. Only the sender
 * can do this: the gift's edit token has to match. Each gift can be emailed a
 * limited number of times, and there are per-IP, per-recipient and site-wide
 * daily limits, so the endpoint can't be used to spam.
 *
 * Runs as a Vercel Function (Web Request/Response API), at /api/send-gift.
 *
 * Env (Vercel > Project > Settings > Environment Variables):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   Gmail:  GMAIL_USER (e.g. dearly.gifts@gmail.com), GMAIL_APP_PASSWORD
 *           (Google Account > Security > 2-Step Verification > App passwords)
 *   Resend: RESEND_API_KEY + MAIL_FROM "Dearly <hello@yourdomain.com>" (domain verified in Resend).
 *           Used instead of Gmail when both are set.
 *   PUBLIC_SITE_URL  optional, e.g. https://dearly.app (defaults to the request host)
 */

import nodemailer from 'nodemailer'

const MAX_EMAILS_PER_GIFT = 5
const MAX_PER_IP_HOUR = 5
const MAX_PER_RECIPIENT_DAY = 3
const MAX_SITE_DAY = 300
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
  return new URL(req.url).origin
}

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } })

const since = (ms) => new Date(Date.now() - ms).toISOString()

async function count(path) {
  const base = process.env.SUPABASE_URL.replace(/\/+$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const res = await fetch(`${base}/rest/v1/${path}`, {
    method: 'HEAD',
    headers: { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), Prefer: 'count=exact' },
  })
  if (!res.ok) throw new Error(`Supabase count ${res.status}`)
  return Number((res.headers.get('content-range') || '*/0').split('/')[1]) || 0
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

async function sendMail({ useResend, to, subject, html, text, fromName }) {
  if (useResend) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }),
    })
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
    return
  }
  const user = process.env.GMAIL_USER
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
  })
  // Gmail requires the account itself as sender; the sender's name shows in the display name.
  await transport.sendMail({
    from: { name: `${fromName.replace(/["<>]/g, '')} via Dearly`, address: user },
    to,
    subject,
    html,
    text,
  })
}

/* Only POST is exported; Vercel answers other methods with 405. */
export async function POST(req) {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' })
  }
  const useResend = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
  const mailEnv = useResend ? [] : ['GMAIL_USER', 'GMAIL_APP_PASSWORD']
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', ...mailEnv].filter((k) => !process.env[k])
  if (missing.length) {
    console.error('send-gift: missing env', missing)
    return json(500, { error: 'Email isn’t set up yet. Copy the link and send it yourself for now.' })
  }

  // Browsers always send Origin on cross-site POSTs; reject other sites calling this.
  // The page calling us must be this deployment (or the configured public URL).
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin && origin !== siteUrl(req)) return json(403, { error: 'Not allowed.' })

  let body
  try {
    body = JSON.parse((await req.text()) || '{}')
    if (!body || typeof body !== 'object') throw new Error('not an object')
  } catch {
    return json(400, { error: 'Bad request.' })
  }
  // Honeypot: a hidden field people never fill in. Pretend it worked.
  if (body.website) return json(200, { ok: true })

  // Vercel's edge sets x-real-ip from the connection and overwrites any client-sent value.
  const ip = (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
  const id = clean(body.id, 10)
  const token = clean(body.token, 36)
  const to = clean(body.to, 254).toLowerCase()
  const fromName = clean(body.fromName, 60)
  const note = clean(body.note, 200)

  if (!ID_RE.test(id) || !TOKEN_RE.test(token)) return json(400, { error: 'This gift couldn’t be found.' })
  if (!EMAIL_RE.test(to)) return json(400, { error: 'That email address doesn’t look right.' })
  if (!fromName) return json(400, { error: 'Add your name so she knows who it’s from.' })

  try {
    const rows = await db(`gifts?id=eq.${id}&edit_token=eq.${token}&select=id,type,email_count`)
    const gift = rows?.[0]
    if (!gift) return json(404, { error: 'This gift couldn’t be found.' })
    if (gift.email_count >= MAX_EMAILS_PER_GIFT) {
      return json(429, { error: 'This gift has been emailed a few times already. Copy the link and send it yourself.' })
    }

    const [byIp, byRecipient, bySite] = await Promise.all([
      ip ? count(`email_log?ip=eq.${encodeURIComponent(ip)}&created_at=gt.${since(3600e3)}&select=id`) : 0,
      count(`email_log?recipient=eq.${encodeURIComponent(to)}&created_at=gt.${since(86400e3)}&select=id`),
      count(`email_log?created_at=gt.${since(86400e3)}&select=id`),
    ])
    if (byIp >= MAX_PER_IP_HOUR || byRecipient >= MAX_PER_RECIPIENT_DAY || bySite >= MAX_SITE_DAY) {
      return json(429, { error: 'Too many emails sent for now. Copy the link and send it yourself, or try again later.' })
    }

    const url = `${siteUrl(req)}/${gift.type}/${gift.id}`
    const subject = `${fromName} made you something`
    const text = `${fromName} made you something on Dearly.${note ? `\n\n“${note}”` : ''}\n\nOpen it: ${url}\n`

    try {
      await sendMail({ useResend, to, subject, html: emailHtml({ fromName, note, url }), text, fromName })
    } catch (err) {
      console.error('send-gift: mail', err)
      return json(502, { error: 'The email couldn’t be sent. Please try again in a moment.' })
    }

    await db('email_log', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ip, recipient: to, gift_id: id }),
    })
    await db(`gifts?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ recipient_email: to, emailed_at: new Date().toISOString(), email_count: gift.email_count + 1 }),
    })
    return json(200, { ok: true })
  } catch (err) {
    console.error('send-gift', err)
    return json(500, { error: 'Something went wrong sending the email. Please try again.' })
  }
}
