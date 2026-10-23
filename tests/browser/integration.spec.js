import { test, expect } from './fixtures'
import { createTestBackend } from '../helpers/backend.mjs'
import { POST as sendGift } from '../../api/send-gift.js'
import { POST as giftEvent } from '../../api/gift-event.js'
import { GET as maintenance } from '../../api/maintenance.js'

test('real browser → API → PostgreSQL: schedule, mail limit, open notice, reply, edit and maintenance', async ({ page, context }) => {
  test.setTimeout(60000)
  const backend = await createTestBackend()
  const originalFetch = globalThis.fetch
  const previousEnv = { ...process.env }
  Object.assign(process.env, { SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test', RESEND_API_KEY: 'test-mail', MAIL_FROM: 'Dearly <gifts@example.com>', CRON_SECRET: 'test-cron-secret', PUBLIC_SITE_URL: 'http://127.0.0.1:4178' })
  globalThis.fetch = backend.fetch
  try {
    await context.route('http://127.0.0.1:54321/**', async (route) => {
      const response = await backend.fetch(route.request().url(), { method: route.request().method(), body: route.request().postData(), headers: { apikey: 'test-anon-key' } })
      await route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' })
    })
    await context.route('**/api/**', async (route) => {
      const request = route.request()
      const handler = request.url().endsWith('send-gift') ? sendGift : giftEvent
      const response = await handler(new Request(request.url(), { method: request.method(), headers: { ...request.headers(), 'x-real-ip': '192.0.2.1' }, body: request.postData() }))
      await route.fulfill({ status: response.status, body: await response.text(), contentType: 'application/json' })
    })
    await page.goto('/letter/new')
    await page.getByLabel('Your letter').fill('An integration keepsake.')
    const future = new Date(Date.now() + 2 * 60000 + 8 * 3600e3).toISOString().slice(0, 16)
    await page.getByLabel('Unlock date and time').fill(future)
    await page.getByLabel('Let them reply').check()
    await page.getByLabel("Tell me when it's opened").check()
    await page.getByLabel('Your email for the opened notice').fill('sender@example.com')
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await page.getByRole('button', { name: 'Looks right, get the link' }).click()
    const share = await page.getByLabel('Share link').inputValue()
    const row = (await backend.db.query('select id,edit_token from public.gifts')).rows[0]
    expect(share).toContain(row.id)

    // Exercise the real send endpoint and atomic SQL reservation four times.
    await page.getByLabel('Email it to her', { exact: true }).check()
    for (let i = 0; i < 4; i++) {
      await page.getByLabel('Her email', { exact: true }).fill('recipient@example.com')
      await page.getByLabel('Your name', { exact: true }).fill('Sender')
      await page.getByRole('button', { name: 'Send it to her', exact: true }).click()
      if (i < 3) {
        await expect(page.getByText('Sent to', { exact: false }).first()).toBeVisible()
        await page.getByRole('button', { name: 'Send to another address' }).click()
      }
    }
    await expect(page.getByText('Email limit reached. Copy the link, or try again in a few hours.')).toBeVisible()
    expect(backend.mail).toHaveLength(3)

    await page.goto(share)
    await expect(page.getByText('Something is waiting for you.')).toBeVisible()
    await expect(page.getByText('An integration keepsake.')).toHaveCount(0)
    await backend.db.query("update gifts set unlock_at=now()-interval '1 second' where id=$1", [row.id])
    await page.getByRole('button', { name: 'Check again', exact: true }).click()
    await page.getByRole('button', { name: 'Open my gift' }).click()
    await expect(page.getByText('An integration keepsake.')).toBeVisible()
    expect(backend.mail).toHaveLength(4)
    await page.getByLabel('Your reply or emoji').fill('Received with love 💛')
    await page.getByRole('button', { name: 'Send reply', exact: true }).click()
    await expect(page.getByText('Your reply is waiting for them. Thank you.')).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: 'Open my gift' }).click()
    await expect(page.getByText('An integration keepsake.')).toBeVisible()
    expect(backend.mail).toHaveLength(4)

    await page.goto(`/letter/new?edit=${row.id}&key=${row.edit_token}`)
    await expect(page.getByLabel('Your letter')).toHaveValue('An integration keepsake.')
    await page.getByRole('button', { name: 'Check replies' }).click()
    await expect(page.getByText('Received with love 💛')).toBeVisible()
    await page.getByLabel("Tell me when it's opened").uncheck()
    await page.getByLabel('Your letter').fill('Updated keepsake, same link.')
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await page.getByRole('button', { name: 'Save changes', exact: true }).click()
    await expect(page.getByLabel('Share link')).toHaveValue(share)
    expect((await backend.db.query('select sender_email from gifts where id=$1', [row.id])).rows[0].sender_email).toBeNull()
    await page.goto(share)
    await expect(page.getByText('Updated keepsake, same link.')).toBeVisible()
    const response = await maintenance(new Request('http://127.0.0.1:4178/api/maintenance', { headers: { Authorization: 'Bearer test-cron-secret' } }))
    expect(response.status).toBe(200)
  } finally {
    globalThis.fetch = originalFetch
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
    Object.assign(process.env, previousEnv)
    await backend.db.close()
  }
})
