import { createTestDatabase } from './database.mjs'

// A local PostgREST-shaped adapter over real PostgreSQL for integration tests.
// No request ever reaches a hosted project or email provider.
export async function createTestBackend() {
  const db = await createTestDatabase()
  const mail = []
  const scalar = new Set(['update_gift', 'record_gift_event', 'reserve_gift_email'])
  const allowed = new Set(['create_gift', 'update_gift', 'get_gift', 'get_gift_for_edit', 'get_gift_replies', 'record_gift_event', 'reserve_gift_email', 'claim_opened_notifications'])
  const fetch = async (address, init = {}) => {
    const url = new URL(address)
    if (url.origin === 'https://api.resend.com') {
      mail.push({ ...JSON.parse(init.body), idempotencyKey: init.headers['Idempotency-Key'] })
      return Response.json({ id: `mail-${mail.length}` })
    }
    if (!['http://127.0.0.1:54321', 'https://database.invalid'].includes(url.origin)) throw new Error('Unexpected external request in integration test')
    try {
      const result = await db.transaction(async (tx) => {
        const service = init.headers?.apikey === 'sb_secret_test'
        await tx.exec(`set local role ${service ? 'service_role' : 'anon'}`)
        if (url.pathname.includes('/rpc/')) {
          const name = url.pathname.split('/').at(-1)
          if (!allowed.has(name)) throw new Error('Unknown RPC')
          const args = JSON.parse(init.body || '{}')
          const entries = Object.entries(args)
          if (entries.some(([key]) => !/^p_[a-z_]+$/.test(key))) throw new Error('Invalid argument name')
          const parameters = entries.map(([key], i) => `${key} => $${i + 1}`).join(', ')
          const rows = (await tx.query(`select * from public.${name}(${parameters})`, entries.map(([, value]) => value && typeof value === 'object' ? JSON.stringify(value) : value))).rows
          return scalar.has(name) ? rows[0][name] : rows
        }
        if (url.pathname.endsWith('/opened_notifications') && init.method === 'PATCH') {
          await tx.query('update public.opened_notifications set sent_at=$1 where gift_id=$2', [JSON.parse(init.body).sent_at, url.searchParams.get('gift_id').slice(3)])
          return null
        }
        if (url.pathname.endsWith('/gifts')) return (await tx.query('select id from public.gifts limit 1')).rows
        throw new Error('Unknown database path')
      })
      return result === null && init.method === 'PATCH' ? new Response(null, { status: 204 }) : Response.json(result)
    } catch (err) { return Response.json({ code: err.code, message: err.message }, { status: 400 }) }
  }
  return { db, mail, fetch }
}
