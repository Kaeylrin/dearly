import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { POST as event } from '../api/gift-event.js'
import { POST as send } from '../api/send-gift.js'
import { GET as maintenance } from '../api/maintenance.js'

const realFetch = globalThis.fetch
const id = 'AbCdEf2345'
const token = '11111111-1111-4111-8111-111111111111'
const request = (body, origin = 'https://testing.example') => new Request('https://testing.example/api/gift-event', { method: 'POST', headers: { origin, 'Content-Type': 'application/json', 'x-real-ip': '192.0.2.1' }, body: typeof body === 'string' ? body : JSON.stringify(body) })
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://database.invalid'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test'
  process.env.RESEND_API_KEY = 'test-mail'
  process.env.MAIL_FROM = 'Dearly <gifts@example.com>'
  process.env.CRON_SECRET = 'test-cron-secret'
})
afterEach(() => { globalThis.fetch = realFetch })

test('event API rejects cross-origin requests, invalid JSON and oversized replies', async () => {
  globalThis.fetch = () => { throw new Error('Unexpected backend request') }
  assert.equal((await event(request({ id, action: 'open' }, 'https://elsewhere.example'))).status, 403)
  assert.equal((await event(request('{'))).status, 400)
  assert.equal((await event(request({ id, action: 'reply', message: 'x'.repeat(501) }))).status, 400)
})

test('event API handles locked gifts and database rate limits', async () => {
  globalThis.fetch = async () => Response.json(false)
  assert.equal((await event(request({ id, action: 'open' }))).status, 404)
  globalThis.fetch = async () => Response.json({ code: 'P0429' }, { status: 400 })
  assert.equal((await event(request({ id, action: 'reply', message: 'Hello' }))).status, 429)
})

test('opened email delivery uses a stable idempotency key and marks its queued record sent', async () => {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    if (url.endsWith('record_gift_event')) return Response.json(true)
    if (url.endsWith('claim_opened_notifications')) return Response.json([{ gift_id: id, sender_email: 'sender@example.com' }])
    if (url.startsWith('https://api.resend.com/')) return Response.json({ id: 'sent' })
    return new Response(null, { status: 204 })
  }
  assert.equal((await event(request({ id, action: 'open' }))).status, 200)
  assert.equal(calls[2].init.headers['Idempotency-Key'], `opened-${id}`)
  assert.equal(calls[3].init.method, 'PATCH')
})

test('send API reserves before delivery and returns an actionable limit error', async () => {
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init })
    return Response.json(url.endsWith('reserve_gift_email') ? 'letter' : { id: 'mail' })
  }
  assert.equal((await send(request({ id, token, to: 'recipient@example.com', fromName: 'Me' }))).status, 200)
  assert.match(calls[0].url, /reserve_gift_email$/)
  assert.match(calls[1].url, /resend.com/)
  globalThis.fetch = async () => Response.json({ code: 'P0429' }, { status: 400 })
  const response = await send(request({ id, token, to: 'recipient@example.com', fromName: 'Me' }))
  assert.equal(response.status, 429)
  assert.match((await response.json()).error, /Copy the link/)
})

test('maintenance requires its secret before any database activity', async () => {
  globalThis.fetch = () => { throw new Error('Unexpected backend request') }
  assert.equal((await maintenance(new Request('https://testing.example/api/maintenance'))).status, 401)
  const calls = []
  globalThis.fetch = async (url) => { calls.push(url); return Response.json([]) }
  assert.equal((await maintenance(new Request('https://testing.example/api/maintenance', { headers: { authorization: 'Bearer test-cron-secret' } }))).status, 200)
  assert.equal(calls.length, 2)
})
