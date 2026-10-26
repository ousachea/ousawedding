import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zonedTimeToUtc, formatDate, weddingDates, shiftLocal, minutesBetween } from '../shared/utils/time.ts'

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

test('weddingDates formats the date and deadline in the wedding timezone', () => {
  const d = weddingDates('2027-02-14T16:00', '2027-01-31T23:59', 'Asia/Phnom_Penh', new Date('2027-02-01T00:00:00Z'))
  assert.equal(d.dateUtc, '2027-02-14T09:00:00.000Z')
  assert.equal(d.deadlineUtc, '2027-01-31T16:59:00.000Z')
  assert.equal(d.deadlinePassed, true)
  assert.match(d.display.en.date, /February 14, 2027/)
})

test('shiftLocal and minutesBetween move wall-clock times across days and months', () => {
  assert.equal(minutesBetween('2027-01-31T07:00', '2027-01-01T07:00'), -30 * 24 * 60)
  assert.equal(shiftLocal('2027-01-30T14:00', -30 * 24 * 60), '2026-12-31T14:00')
  assert.equal(shiftLocal('2027-01-31T23:30', 45), '2027-02-01T00:15')
})
