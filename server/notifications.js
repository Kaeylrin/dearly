import { db, rpc } from './backend.js'
import { hasMailProvider, sendMail } from './mail.js'

export async function deliverOpenedNotices(id = null) {
  if (!hasMailProvider()) return
  const pending = await rpc('claim_opened_notifications', { p_id: id })
  for (const row of pending) {
    try {
      const subject = 'Your Dearly gift was opened'
      const text = 'Someone opened your Dearly gift. A link can be forwarded, so this does not confirm who opened it. You requested this one-time notice when creating the gift.'
      await sendMail({ to: row.sender_email, subject, text, idempotencyKey: `opened-${row.gift_id}` })
      await db(`opened_notifications?gift_id=eq.${row.gift_id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ sent_at: new Date().toISOString() }) })
    } catch {
      // Keep the job for the next scheduled retry; do not log private addresses.
      console.error('Opened notice delivery failed; queued for retry')
    }
  }
}
