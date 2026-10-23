import { deflateRawSync } from 'node:zlib'
import { test, expect } from './fixtures'
import { gifts, waveFile } from '../helpers/gifts.mjs'

const id = 'AbCdEf2345'
const token = '11111111-1111-4111-8111-111111111111'

async function exerciseGift(page, type) {
  switch (type) {
    case 'letter': await expect(page.getByText(gifts.letter.body)).toBeVisible(); break
    case 'bouquet': await expect(page.getByText(gifts.bouquet.note)).toBeVisible(); break
    case 'countdown': await expect(page.getByText(gifts.countdown.message)).toBeVisible(); break
    case 'scratch':
      await page.getByRole('button', { name: 'Reveal it all at once' }).click()
      await expect(page.getByText(gifts.scratch.message, { exact: true })).toBeVisible(); break
    case 'reasons':
      await page.getByRole('button', { name: 'Tell me one' }).click()
      await page.getByRole('button', { name: 'Another one' }).click()
      await expect(page.getByText('You listen.', { exact: true })).toBeVisible()
      await expect(page.getByText('You make me smile.', { exact: true })).toBeVisible(); break
    case 'timeline':
      await expect(page.getByText('The beginning', { exact: true })).toBeVisible()
      await expect.poll(() => page.getByAltText('Photo: The beginning').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0); break
    case 'voice':
      await expect(page.getByText('A voice for you.', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Play', exact: true }).click()
      await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible(); break
    case 'quiz':
      await page.getByRole('button', { name: 'Start', exact: true }).click()
      await page.getByRole('button', { name: 'Tea', exact: true }).click()
      await page.getByRole('button', { name: 'See how you did' }).click()
      await expect(page.getByRole('heading', { name: '1 of 1', exact: true })).toBeVisible(); break
  }
}

for (const [type, data] of Object.entries(gifts)) {
  test(`${type}: draft → preview → save → recipient interaction`, async ({ page }) => {
    let stored
    await page.addInitScript(({ type, data }) => localStorage.setItem(`dearly-draft-${type}`, JSON.stringify(data)), { type, data })
    await page.route('http://127.0.0.1:54321/**', async (route) => {
      if (route.request().url().includes('/storage/v1/object/') && route.request().method() === 'GET') {
        return route.fulfill({ contentType: type === 'voice' ? 'audio/wav' : 'image/png', body: type === 'voice' ? waveFile() : Buffer.from(data.entries[0].photo.split(',')[1], 'base64') })
      }
      const name = route.request().url().split('/').at(-1)
      if (name === 'create_gift') { stored = route.request().postDataJSON().p_data; await route.fulfill({ json: [{ id, edit_token: token }] }); return }
      await route.fulfill({ json: name === 'get_gift' ? [{ type, data: stored, locked: false }] : [] })
    })
    await page.goto(`/${type}/new`)
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(page.getByText('What she’ll see', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Looks right, get the link' }).click()
    const url = await page.getByLabel('Share link').inputValue()
    expect(stored).toBeTruthy()
    await page.goto(url)
    await exerciseGift(page, type)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })

  test(`${type}: existing legacy fragment still opens`, async ({ page }) => {
    const payload = 'j' + Buffer.from(JSON.stringify({ v: 1, t: type, d: data })).toString('base64url')
    await page.goto(`/${type}/${id}#${payload}`)
    await exerciseGift(page, type)
  })
}

test('compressed legacy payload and corrupt payloads fail gracefully', async ({ page }) => {
  const compressed = 'z' + deflateRawSync(JSON.stringify({ v: 1, t: 'letter', d: gifts.letter })).toString('base64url')
  await page.goto(`/letter/${id}#${compressed}`)
  await expect(page.getByText(gifts.letter.body)).toBeVisible()
  for (const payload of ['%broken', 'zbroken', 'j' + Buffer.from('{}').toString('base64url')]) {
    await page.goto(`/letter/${id}#${payload}`)
    await expect(page.getByRole('heading', { name: 'This link didn’t come through whole.' })).toBeVisible()
  }
})

test('failed edit link clears stale ownership and saving never overwrites the old draft', async ({ page }) => {
  await page.addInitScript(({ id, token }) => {
    localStorage.setItem('dearly-draft-letter', JSON.stringify({ body: 'An unrelated draft.' }))
    localStorage.setItem('dearly-saved-letter', JSON.stringify({ id, token }))
  }, { id, token })
  let creates = 0
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const name = route.request().url().split('/').at(-1)
    expect(name).not.toBe('update_gift')
    if (name === 'create_gift') creates++
    await route.fulfill({ json: name === 'create_gift' ? [{ id, edit_token: token }] : [] })
  })
  await page.goto(`/letter/new?edit=NoSuch1234&key=${token}`)
  await expect(page.getByText('That edit link didn’t open, so you’re starting fresh.')).toBeVisible()
  await expect(page.getByLabel('Your letter')).toHaveValue('')
  await page.getByLabel('Your letter').fill('A new gift.')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: 'Looks right, get the link' }).click()
  await expect(page.getByLabel('Share link')).toBeVisible()
  expect(creates).toBe(1)
})

test('save failures are recoverable and invalid edit keys do not silently create a new gift', async ({ page }) => {
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const name = route.request().url().split('/').at(-1)
    if (name === 'get_gift_for_edit') return route.fulfill({ json: [{ type: 'letter', data: gifts.letter }] })
    expect(name).not.toBe('create_gift')
    await route.fulfill({ json: false })
  })
  await page.goto(`/letter/new?edit=${id}&key=${token}`)
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByText('Something went wrong saving your gift. Check your connection and try again.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled()
})

test('bundle preserves quiz progress while moving between gifts and can reset its editor', async ({ page }) => {
  const data = { title: 'A bundle', items: [{ type: 'quiz', data: gifts.quiz }, { type: 'letter', data: gifts.letter }] }
  await page.route('http://127.0.0.1:54321/**', (route) => route.fulfill({ json: [{ type: 'bundle', data }] }))
  await page.goto(`/bundle/${id}`)
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Tea', exact: true }).click()
  await page.getByRole('button', { name: 'See how you did' }).click()
  await page.getByRole('button', { name: 'Next gift' }).click()
  await page.getByRole('button', { name: 'Previous gift' }).click()
  await expect(page.getByRole('heading', { name: '1 of 1', exact: true })).toBeVisible()
  await page.goto('/bundle/new')
  await page.getByLabel('Add another gift').selectOption('quiz')
  await page.getByRole('button', { name: 'Clear and start over' }).click()
  await expect(page.getByLabel('Your letter')).toBeVisible()
})

test('voice upload rejects invalid audio and accepts playable WAV', async ({ page }) => {
  await page.goto('/voice/new')
  const input = page.locator('input[type=file]')
  await input.setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('broken') })
  await expect(page.getByRole('alert')).toContainText('Could not read this audio')
  await input.setInputFiles({ name: 'voice.wav', mimeType: 'audio/wav', buffer: waveFile() })
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
})

test('microphone records synthetic audio, stops and plays back', async ({ page }) => {
  await page.goto('/voice/new')
  await page.getByRole('button', { name: 'Start recording', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop recording', exact: true })).toBeVisible()
  await expect(page.getByText('0:01 / 0:45', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
})

test('recorder initialization failures release the microphone and show a useful error', async ({ page }) => {
  await page.addInitScript(() => {
    window.stoppedTracks = 0
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop: () => window.stoppedTracks++ }] })
    window.MediaRecorder = class {
      static isTypeSupported() { return true }
      constructor() { throw new Error('Recorder unavailable') }
    }
  })
  await page.goto('/voice/new')
  await page.getByRole('button', { name: 'Start recording', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('This browser could not start recording')
  expect(await page.evaluate(() => window.stoppedTracks)).toBe(1)
})

test('microphone permission resolving after navigation immediately releases its stream', async ({ page }) => {
  await page.addInitScript(() => {
    window.stoppedTracks = 0
    navigator.mediaDevices.getUserMedia = () => new Promise((resolve) => { window.allowMicrophone = () => resolve({ getTracks: () => [{ stop: () => window.stoppedTracks++ }] }) })
  })
  await page.goto('/voice/new')
  await page.getByRole('button', { name: 'Start recording', exact: true }).click()
  await page.evaluate(async () => { const { router } = await import('/src/app/router.jsx'); await router.navigate('/letter/new') })
  await expect(page.getByLabel('Your letter')).toBeVisible()
  await page.evaluate(() => window.allowMicrophone())
  await expect.poll(() => page.evaluate(() => window.stoppedTracks)).toBe(1)
})

test('switching gift links never shows the previous gift while the next one loads', async ({ page }) => {
  let release
  const pending = new Promise((resolve) => { release = resolve })
  await page.route('http://127.0.0.1:54321/**', async (route) => {
    const second = route.request().postDataJSON().p_id === 'Second1234'
    if (second) await pending
    await route.fulfill({ json: [{ type: 'letter', data: { body: second ? 'Second gift.' : 'First gift.' } }] })
  })
  await page.goto(`/letter/${id}`)
  await expect(page.getByText('First gift.', { exact: true })).toBeVisible()
  await page.evaluate(async () => { const { router } = await import('/src/app/router.jsx'); await router.navigate('/letter/Second1234') })
  await expect(page.getByText('First gift.', { exact: true })).toHaveCount(0)
  release()
  await expect(page.getByText('Second gift.', { exact: true })).toBeVisible()
})

test('bouquet exports a nonempty PNG and JPG', async ({ page }) => {
  const payload = 'j' + Buffer.from(JSON.stringify({ v: 1, t: 'bouquet', d: gifts.bouquet })).toString('base64url')
  await page.goto(`/bouquet/${id}#${payload}`)
  for (const format of ['PNG', 'JPG']) {
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: `Save as ${format}`, exact: true }).click()
    const download = await pending
    expect(await download.failure()).toBeNull()
    const stream = await download.createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    expect(Buffer.concat(chunks).length).toBeGreaterThan(1000)
  }
})

test('home, legal pages, not-found and native section jumps work without runtime errors', async ({ page }) => {
  for (const path of ['/', '/privacy', '/terms', '/changelog', '/not-a-page']) {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    await expect(page.getByText('Unexpected Application Error!')).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.goto('/')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.evaluate(async () => {
    const { scrollToTarget } = await import('/src/lib/smoothScroll.js')
    scrollToTarget(document.getElementById('gifts'))
  })
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('gifts').getBoundingClientRect().top - 110))).toBeLessThan(3)
  expect(await page.evaluate(() => document.documentElement.classList.contains('lenis-on'))).toBe(false)
})

test('malformed gift data shows a friendly error without a render exception', async ({ page }) => {
  for (const [type, data] of [
    ['timeline', { entries: [{ date: '2026-99-99', title: 'Bad date' }] }],
    ['countdown', { target: '+275760-09-13T00:00:00.000Z', monthly: true }],
    ['letter', null],
    ['bundle', { items: [{ type: 'bundle', data: {} }] }],
  ]) {
    await page.route('http://127.0.0.1:54321/**', (route) => route.fulfill({ json: [{ type, data }] }))
    await page.goto(`/${type}/${id}`)
    await expect(page.getByRole('heading', { name: 'We couldn’t find this gift.' })).toBeVisible()
    await page.unroute('http://127.0.0.1:54321/**')
  }
})

test('reply sending prevents duplicate submissions and keeps the message after a server failure', async ({ page }) => {
  await page.route('http://127.0.0.1:54321/**', (route) => route.fulfill({ json: [{ type: 'letter', data: gifts.letter, allow_replies: true }] }))
  let finish
  const pending = new Promise((resolve) => { finish = resolve })
  let calls = 0
  await page.route('**/api/gift-event', async (route) => {
    calls++
    await pending
    await route.fulfill({ status: 503, json: { error: 'Please try again.' } })
  })
  await page.goto(`/letter/${id}`)
  await page.getByLabel('Your reply or emoji').fill('A reply worth keeping.')
  await page.getByRole('button', { name: 'Send reply', exact: true }).click()
  await expect(page.getByLabel('Your reply or emoji')).toBeDisabled()
  finish()
  await expect(page.getByText('Please try again.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Your reply or emoji')).toHaveValue('A reply worth keeping.')
  await expect(page.getByLabel('Your reply or emoji')).toBeEnabled()
  expect(calls).toBe(1)
})

test('theme changes persist and mobile navigation opens and closes', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to dark mode' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Switch to light mode' }).click()
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(page.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
  }
})
