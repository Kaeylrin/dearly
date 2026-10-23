import nodemailer from 'nodemailer'

export function hasMailProvider() {
  return Boolean((process.env.RESEND_API_KEY && process.env.MAIL_FROM) || (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD))
}

export async function sendMail({ to, subject, html, text, fromName = 'Dearly', idempotencyKey }) {
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html, text }),
    })
    if (!res.ok) throw new Error(`Mail provider returned ${res.status}`)
    return
  }
  if (!hasMailProvider()) throw new Error('Mail is not configured')
  const user = process.env.GMAIL_USER
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000,
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '') },
  })
  await transport.sendMail({
    from: { name: fromName === 'Dearly' ? 'Dearly' : `${fromName.replace(/["<>]/g, '')} via Dearly`, address: user },
    to, subject, html, text,
    ...(idempotencyKey ? { messageId: `<${idempotencyKey}@dearly>` } : {}),
  })
}
