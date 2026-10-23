import { db, json } from '../server/backend.js'
import { deliverOpenedNotices } from '../server/notifications.js'

export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return json(401, { error: 'Not allowed.' })
  try {
    // Minimal database activity/health check; no content is returned to the caller.
    await db('gifts?select=id&limit=1')
    await deliverOpenedNotices()
    return json(200, { ok: true })
  } catch { return json(503, { error: 'Maintenance failed.' }) }
}
