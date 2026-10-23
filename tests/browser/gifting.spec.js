import { test, expect } from './fixtures'

const id = 'AbCdEf2345'
const token = '11111111-1111-4111-8111-111111111111'
const gift = { type: 'letter', data: { body: 'A secret just for you.', to: '', closing: '', from: '' }, locked: false, notify_opened: false, allow_replies: false }

async function backend(page, respond = () => [gift]) {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const name = route.request().url().split('/').at(-1)
    const result = respond(name, route.request().postDataJSON())
    await route.fulfill({ json: result, headers: { 'Access-Control-Allow-Origin': '*' } })
  })
}

test('scheduled content stays hidden despite a changed phone clock, then unlocks on server confirmation', async ({ page }) => {
  let locked = true
  await backend(page, () => [{ ...gift, data: locked ? null : gift.data, locked, unlock_at: '2099-01-01T00:00:00Z', server_now: '2098-12-31T23:58:00Z' }])
  await page.goto(`/letter/${id}`)
  await expect(page.getByText('Something is waiting for you.')).toBeVisible()
  await page.clock.setSystemTime(new Date('2100-01-01T00:00:00Z'))
  await page.getByRole('button', { name: 'Check again', exact: true }).click()
  await expect(page.getByText(gift.data.body)).toHaveCount(0)
  locked = false
  await page.getByRole('button', { name: 'Check again', exact: true }).click()
  await expect(page.getByText(gift.data.body)).toBeVisible()
})

test('opened notice is disclosed and a recipient can send a reply', async ({ page }) => {
  await backend(page, () => [{ ...gift, notify_opened: true, allow_replies: true }])
  const events = []
  await page.route('**/api/gift-event', async (route) => { events.push(route.request().postDataJSON()); await route.fulfill({ json: { ok: true } }) })
  await page.goto(`/letter/${id}`)
  await expect(page.getByText(/sender asked for a one-time email/)).toBeVisible()
  expect(events).toHaveLength(0)
  await page.getByRole('button', { name: 'Open my gift' }).click()
  await expect(page.getByText(gift.data.body)).toBeVisible()
  await page.getByLabel('Your reply or emoji').fill('Thank you 💛')
  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByText('Your reply is waiting for them. Thank you.')).toBeVisible()
  expect(events.map((e) => e.action)).toEqual(['open', 'reply'])
})

test('creator writes their own message, schedules a gift, and leaves opened notices off', async ({ page }) => {
  let saved
  await backend(page, (name, body) => {
    if (name === 'create_gift') { saved = body; return [{ id, edit_token: token }] }
    return []
  })
  await page.goto('/letter/new')
  await expect(page.getByLabel("Tell me when it's opened")).not.toBeChecked()
  await expect(page.getByLabel('Start with an occasion')).toHaveCount(0)
  await expect(page.getByLabel('Your letter')).toHaveValue('')
  await page.getByLabel('Your letter').fill('These are my own words, just for you.')
  await page.getByLabel('Unlock date and time').fill('2026-12-25T00:00')
  await page.getByLabel('Let them reply').check()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: 'Looks right, get the link' }).click()
  await expect(page.getByLabel('Share link')).toHaveValue(new RegExp(`/letter/${id}$`))
  expect(saved.p_settings).toEqual({ unlockAt: '2026-12-24T16:00:00.000Z', notifyOpened: false, allowReplies: true, senderEmail: '' })
  expect(saved.p_data.body).toBe('These are my own words, just for you.')
})

test('bouquet placement and shuffle are kept in the saved gift', async ({ page }) => {
  let saved
  await backend(page, (name, body) => { if (name === 'create_gift') { saved = body; return [{ id, edit_token: token }] } return [] })
  await page.goto('/bouquet/new')
  await expect(page.getByLabel('Start with an occasion')).toHaveCount(0)
  await expect(page.getByLabel('A note on the card')).toHaveValue('')
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Add red rose', exact: true }).click()
  }
  const flowers = page.getByRole('list', { name: 'Flowers in your bouquet' })
  await expect(flowers.getByRole('button')).toHaveCount(14)
  expect((await flowers.boundingBox()).height).toBeLessThan(200)
  await expect(page.getByRole('button', { name: /Place stem/ })).toHaveCount(0)
  await flowers.getByRole('button', { name: 'Select red rose 1', exact: true }).click()
  await expect(flowers.getByRole('button', { name: 'Select red rose 1', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Place selected flower in spot 14', exact: true }).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: 'Looks right, get the link' }).click()
  await expect(page.getByLabel('Share link')).toBeVisible()
  expect(saved.p_data.positions[0]).toBe(13)
  await page.getByRole('button', { name: 'Keep editing' }).click()
  await flowers.getByRole('button', { name: 'Select red rose 1', exact: true }).click()
  await page.getByRole('button', { name: 'Remove flower', exact: true }).click()
  await expect(flowers.getByRole('button')).toHaveCount(13)
  await page.getByRole('button', { name: 'Shuffle flowers' }).click()
  await expect(page.getByRole('button', { name: 'Shuffle flowers' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('bundles preview multiple gifts and preserve their order in one saved link', async ({ page }) => {
  let saved
  await backend(page, (name, body) => { if (name === 'create_gift') { saved = body; return [{ id, edit_token: token }] } return [] })
  await page.goto('/bundle/new')
  await page.getByLabel('Your letter').fill('First comes a letter.')
  await page.getByLabel('Add another gift').selectOption('quiz')
  await page.getByPlaceholder('Where did we have our first date?').fill('Our favourite drink?')
  await page.getByPlaceholder('Answer 1', { exact: true }).fill('Tea')
  await page.getByPlaceholder('Answer 2', { exact: true }).fill('Coffee')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByText('First comes a letter.')).toBeVisible()
  await page.getByRole('button', { name: 'Next gift' }).click()
  await expect(page.getByText('Gift 2 of 3')).toBeVisible()
  await page.getByRole('button', { name: 'Looks right, get the link' }).click()
  await expect(page.getByLabel('Share link')).toHaveValue(new RegExp(`/bundle/${id}$`))
  expect(saved.p_data.items.map((entry) => entry.type)).toEqual(['letter', 'bouquet', 'quiz'])
})

test('missing gifts show a friendly way home', async ({ page }) => {
  await backend(page, () => [])
  await page.goto(`/letter/${id}`)
  await expect(page.getByRole('heading', { name: 'We couldn’t find this gift.' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Go to Dearly', exact: true })).toBeVisible()
})
