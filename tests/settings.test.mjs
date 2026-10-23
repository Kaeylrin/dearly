import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanSettings, instantToManila, manilaToInstant } from '../src/lib/giftSettings.js'
import { cleanPositions, placeFlower, shuffledPositions } from '../src/gifts/bouquet/placement.js'

test('Manila midnight is a fixed UTC instant regardless of browser timezone', () => {
  assert.equal(manilaToInstant('2026-12-25T00:00'), '2026-12-24T16:00:00.000Z')
  assert.equal(instantToManila('2026-12-24T16:00:00Z'), '2026-12-25T00:00')
  assert.equal(manilaToInstant('invalid'), '')
  assert.equal(cleanSettings({ senderEmail: 'discard@example.com' }).senderEmail, '')
})

test('flower placement swaps occupied slots and keeps a unique position for every stem', () => {
  assert.deepEqual(placeFlower([0, 1, 2], 0, 2), [2, 1, 0])
  assert.deepEqual(cleanPositions([2, 2, -1, 100], 4), [2, 0, 1, 3])
  assert.equal(new Set(shuffledPositions(14)).size, 14)
})
