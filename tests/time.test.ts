import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zonedTimeToUtc, formatDate } from '../shared/utils/time.ts'

test('Phnom Penh (UTC+7, no DST) converts to UTC', () => {
  assert.equal(zonedTimeToUtc('2027-02-14T07:00', 'Asia/Phnom_Penh').toISOString(), '2027-02-14T00:00:00.000Z')
})

test('handles a date line crossing', () => {
  assert.equal(zonedTimeToUtc('2027-01-01T03:00', 'Asia/Phnom_Penh').toISOString(), '2026-12-31T20:00:00.000Z')
})

test('respects daylight saving time', () => {
  // New York is UTC-5 in winter and UTC-4 in summer
  assert.equal(zonedTimeToUtc('2027-01-15T12:00', 'America/New_York').toISOString(), '2027-01-15T17:00:00.000Z')
  assert.equal(zonedTimeToUtc('2027-07-15T12:00', 'America/New_York').toISOString(), '2027-07-15T16:00:00.000Z')
})

test('formats Khmer and English dates in the wedding timezone', () => {
  const d = zonedTimeToUtc('2027-02-14T23:30', 'Asia/Phnom_Penh')
  assert.match(formatDate(d, 'en', 'Asia/Phnom_Penh'), /February 14, 2027/)
  assert.match(formatDate(d, 'km', 'Asia/Phnom_Penh'), /កុម្ភៈ/)
})
