import nodemailer from 'nodemailer'
import { db, rpc } from './backend.js'

export async function deliverOpenedNotices(id = null) {
  const useResend = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM)
  if (!useResend && !(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)) return
  const pending = await rpc('claim_opened_notifications', { p_id: id })
  for (const row of pending) {
    try {
      const subject = 'Your Dearly gift was opened'
      const text = 'Someone opened your Dearly gift. A link can be forwarded, so this does not confirm who opened it. You requested this one-time notice when creating the gift.'
      if (useResend) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `opened-${row.gift_id}` },
          body: JSON.stringify({ from: process.env.MAIL_FROM, to: [row.sender_email], subject, text }),
        })
        if (!response.ok) throw new Error('Mail provider failed')
      } else {
        await nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') } })
          .sendMail({ from: { name: 'Dearly', address: process.env.GMAIL_USER }, to: row.sender_email, subject, text, messageId: `<opened-${row.gift_id}@dearly>` })
      }
      await db(`opened_notifications?gift_id=eq.${row.gift_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sent_at: new Date().toISOString() }) })
    } catch {
      // Keep the job for the next scheduled retry; do not log private addresses.
      console.error('Opened notice delivery failed; queued for retry')
    }
  }
}
