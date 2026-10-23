import { createTestDatabase } from './helpers/database.mjs'
import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'

let db
before(async () => { db = await createTestDatabase() })
after(async () => db?.close())
const query = async (sql, args = []) => (await db.query(sql, args)).rows
const create = async (settings = {}, type = 'letter', data = { body: 'A secret keepsake.' }) => (await query('select * from create_gift($1, $2, $3)', [type, JSON.stringify(data), JSON.stringify(settings)]))[0]

test('server lock withholds all content and rejects opens and replies, while the owner can edit', async () => {
  const gift = await create({ unlockAt: '2099-01-01T00:00:00Z', notifyOpened: true, senderEmail: 'sender@example.com', allowReplies: true })
  const [locked] = await query('select * from get_gift($1, true)', [gift.id])
  assert.equal(locked.locked, true)
  assert.equal(locked.data, null)
  assert.equal('sender_email' in locked, false)
  assert.equal((await query("select record_gift_event($1, 'open', '', 'ip-lock') as ok", [gift.id]))[0].ok, false)
  assert.equal((await query("select record_gift_event($1, 'reply', 'hello', 'ip-lock') as ok", [gift.id]))[0].ok, false)
  assert.equal((await query('select * from get_gift_for_edit($1, $2)', [gift.id, gift.edit_token]))[0].data.body, 'A secret keepsake.')
  await query("update gifts set unlock_at = now() - interval '1 second' where id = $1", [gift.id])
  assert.equal((await query('select * from get_gift($1, false)', [gift.id]))[0].data.body, 'A secret keepsake.')
})

test('only the first explicit open queues one notification and claims are exclusive', async () => {
  const gift = await create({ notifyOpened: true, senderEmail: 'sender@example.com' })
  await query('select * from get_gift($1, true)', [gift.id])
  assert.equal((await query('select * from opened_notifications where gift_id=$1', [gift.id])).length, 0)
  await query("select record_gift_event($1, 'open', '', 'ip-open')", [gift.id])
  await query("select record_gift_event($1, 'open', '', 'ip-open')", [gift.id])
  assert.equal((await query('select * from opened_notifications where gift_id=$1', [gift.id])).length, 1)
  assert.equal((await query('select * from claim_opened_notifications($1)', [gift.id])).length, 1)
  assert.equal((await query('select * from claim_opened_notifications($1)', [gift.id])).length, 0)
  await query("update opened_notifications set claimed_at=now()-interval '11 minutes' where gift_id=$1", [gift.id])
  assert.equal((await query('select * from claim_opened_notifications($1)', [gift.id])).length, 1)
})

test('email consent is off by default, ignored addresses are discarded, and disabling clears it', async () => {
  const gift = await create({ senderEmail: 'discard@example.com' })
  assert.equal((await query('select sender_email from gifts where id=$1', [gift.id]))[0].sender_email, null)
  await query('select update_gift($1, $2, $3, $4)', [gift.id, gift.edit_token, '{}', '{"notifyOpened":true,"senderEmail":"optin@example.com"}'])
  await query('select update_gift($1, $2, $3, $4)', [gift.id, gift.edit_token, '{}', '{}'])
  assert.equal((await query('select sender_email from gifts where id=$1', [gift.id]))[0].sender_email, null)
  await assert.rejects(create({ notifyOpened: true, senderEmail: 'invalid' }), /invalid_sender_email/)
})

test('replies are private to the edit token and enforce length, opt-in and limits', async () => {
  const gift = await create({ allowReplies: true })
  await query("select record_gift_event($1, 'reply', 'Thank you 💛', 'ip-reply')", [gift.id])
  assert.equal((await query('select * from get_gift_replies($1,$2)', [gift.id, gift.edit_token]))[0].message, 'Thank you 💛')
  assert.equal((await query('select * from get_gift_replies($1,$2)', [gift.id, '00000000-0000-0000-0000-000000000000'])).length, 0)
  await assert.rejects(query("select record_gift_event($1, 'reply', $2, 'ip-reply')", [gift.id, 'x'.repeat(501)]), /invalid_reply/)
  for (let i = 0; i < 9; i++) await query("select record_gift_event($1, 'reply', 'again', 'ip-reply')", [gift.id])
  await assert.rejects(query("select record_gift_event($1, 'reply', 'again', 'ip-reply')", [gift.id]), /rate_limited/)
  const disabled = await create()
  assert.equal((await query("select record_gift_event($1, 'reply', 'hello', 'ip-reply') as ok", [disabled.id]))[0].ok, false)
})

test('three email reservations survive browser resets and expire after three hours', async () => {
  const gift = await create()
  for (let i = 0; i < 3; i++) assert.equal((await query('select reserve_gift_email($1,$2,$3,$4) as kind', [gift.id, gift.edit_token, 'recipient@example.com', 'ip-email']))[0].kind, 'letter')
  await assert.rejects(query('select reserve_gift_email($1,$2,$3,$4)', [gift.id, gift.edit_token, 'recipient@example.com', 'ip-email']), /rate_limited/)
  const another = await create()
  await assert.rejects(query('select reserve_gift_email($1,$2,$3,$4)', [another.id, another.edit_token, 'other@example.com', 'ip-email']), /rate_limited/)
  await db.exec("update private.rate_events set at=now()-interval '4 hours' where bucket like 'mail:gift:%' or bucket like 'mail:ip:%'")
  assert.equal((await query('select reserve_gift_email($1,$2,$3,$4) as kind', [gift.id, gift.edit_token, 'different@example.com', 'ip-email']))[0].kind, 'letter')
})

test('legacy RPC arguments still work; anonymous users cannot access data tables or service functions', async () => {
  const gift = (await query("select * from create_gift('bundle', '{\"items\":[]}')"))[0]
  assert.equal((await query('select update_gift($1,$2,$3) as ok', [gift.id, gift.edit_token, '{}']))[0].ok, true)
  await db.exec('set role anon')
  try {
    assert.equal((await query('select * from get_gift($1,false)', [gift.id]))[0].type, 'bundle')
    await assert.rejects(query('select * from gifts'), /permission denied/)
    await assert.rejects(query('select * from gift_replies'), /permission denied/)
    await assert.rejects(query("select record_gift_event($1,'open','','ip')", [gift.id]), /permission denied/)
    await assert.rejects(query('select * from claim_opened_notifications(null)'), /permission denied/)
  } finally { await db.exec('reset role') }
})

test('old edit calls preserve options and opt-out prevents pending notice delivery', async () => {
  const gift = await create({ notifyOpened: true, senderEmail: 'pending@example.com', allowReplies: true })
  await query('select update_gift($1,$2,$3)', [gift.id, gift.edit_token, '{"body":"Edited"}'])
  assert.equal((await query('select * from get_gift_for_edit($1,$2)', [gift.id, gift.edit_token]))[0].settings.notifyOpened, true)
  await query("select record_gift_event($1,'open','','ip-optout')", [gift.id])
  await query('select update_gift($1,$2,$3,$4)', [gift.id, gift.edit_token, '{"body":"Edited"}', '{}'])
  assert.equal((await query('select * from claim_opened_notifications($1)', [gift.id])).length, 0)
  const count = (await query('select count(*)::int as count from gifts'))[0].count
  await assert.rejects(create({ notifyOpened: true, senderEmail: '' }), /invalid_sender_email/)
  assert.equal((await query('select count(*)::int as count from gifts'))[0].count, count)
})
