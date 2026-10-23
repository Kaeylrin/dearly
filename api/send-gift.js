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
import { rpc } from '../server/backend.js'

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
  const ip = req.headers.get('x-real-ip') || null
  const id = clean(body.id, 10)
  const token = clean(body.token, 36)
  const to = clean(body.to, 254).toLowerCase()
  const fromName = clean(body.fromName, 60)
  const note = clean(body.note, 200)

  if (!ID_RE.test(id) || !TOKEN_RE.test(token)) return json(400, { error: 'This gift couldn’t be found.' })
  if (!EMAIL_RE.test(to)) return json(400, { error: 'That email address doesn’t look right.' })
  if (!fromName) return json(400, { error: 'Add your name so she knows who it’s from.' })

  try {
    const type = await rpc('reserve_gift_email', { p_id: id, p_token: token, p_to: to, p_ip: ip })
    if (!type) return json(404, { error: 'This gift couldn’t be found.' })
    const url = `${siteUrl(req)}/${type}/${id}`
    const subject = `${fromName} made you something`
    const text = `${fromName} made you something on Dearly.${note ? `\n\n“${note}”` : ''}\n\nOpen it: ${url}\n`

    try {
      await sendMail({ useResend, to, subject, html: emailHtml({ fromName, note, url }), text, fromName })
    } catch (err) {
      console.error('send-gift: mail', err)
      return json(502, { error: 'The email couldn’t be sent. Please try again in a moment.' })
    }

    return json(200, { ok: true })
  } catch (err) {
    if (err.code === 'P0429') return json(429, { error: 'Email limit reached. Copy the link, or try again in a few hours.' })
    console.error('send-gift', err)
    return json(500, { error: 'Something went wrong sending the email. Please try again.' })
  }
}
