import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanSettings, instantToManila, manilaToInstant } from '../src/lib/giftSettings.js'
import { cleanPositions, placeFlower, shuffledPositions } from '../src/gifts/bouquet/placement.js'
import { isCalendarDate, shiftCalendarMonths } from '../src/lib/dates.js'

test('Manila midnight is a fixed UTC instant regardless of browser timezone', () => {
  assert.equal(manilaToInstant('2026-12-25T00:00'), '2026-12-24T16:00:00.000Z')
  assert.equal(instantToManila('2026-12-24T16:00:00Z'), '2026-12-25T00:00')
  assert.equal(manilaToInstant('invalid'), '')
  assert.equal(cleanSettings({ senderEmail: 'discard@example.com' }).senderEmail, '')
})

test('invalid dates are rejected instead of silently moving to another month', () => {
  assert.equal(isCalendarDate('2026-02-29'), false)
  assert.equal(isCalendarDate('2028-02-29'), true)
  assert.equal(isCalendarDate('2026-99-99'), false)
  assert.equal(manilaToInstant('2026-02-31T12:00'), '')
  assert.equal(manilaToInstant('2026-12-25T24:00'), '')
  assert.equal(instantToManila('invalid'), '')
  assert.deepEqual(cleanSettings(null), cleanSettings())
})

test('monthly dates clamp in the sender timezone and preserve local time through DST', () => {
  // January 31 at midnight Manila → February 29 at midnight Manila.
  assert.equal(shiftCalendarMonths('2024-01-30T16:00:00Z', 1, 'Asia/Manila').toISOString(), '2024-02-28T16:00:00.000Z')
  assert.equal(shiftCalendarMonths('2024-01-30T16:00:00Z', 2, 'Asia/Manila').toISOString(), '2024-03-30T16:00:00.000Z')
  assert.equal(shiftCalendarMonths('2024-02-15T17:00:00Z', 1, 'America/New_York').toISOString(), '2024-03-15T16:00:00.000Z')
  assert.equal(shiftCalendarMonths('2024-02-10T07:30:00Z', 1, 'America/New_York').toISOString(), '2024-03-10T07:30:00.000Z')
})

test('flower placement swaps occupied slots and keeps a unique position for every stem', () => {
  assert.deepEqual(placeFlower([0, 1, 2], 0, 2), [2, 1, 0])
  assert.deepEqual(cleanPositions([2, 2, -1, 100], 4), [2, 0, 1, 3])
  assert.equal(new Set(shuffledPositions(14)).size, 14)
})
