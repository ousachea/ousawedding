import { test } from 'node:test'
import assert from 'node:assert/strict'
import { zonedTimeToUtc, formatDate, formatTime, eventDisplay, weddingDates, shiftLocal, minutesBetween, localDateParts } from '../shared/utils/time.ts'

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

test('Khmer times use Khmer digits and the time of day as a word', () => {
  const at = (h: number, m = 0) => new Date(Date.UTC(2027, 0, 1, h - 7, m))
  assert.equal(formatTime(at(7), 'km', 'Asia/Phnom_Penh'), '៧:០០ ព្រឹក')
  assert.equal(formatTime(at(14, 30), 'km', 'Asia/Phnom_Penh'), '២:៣០ រសៀល')
  assert.equal(eventDisplay(at(14), at(15), 'Asia/Phnom_Penh').km.time, '២:០០ – ៣:០០ រសៀល')
  assert.equal(eventDisplay(at(10), at(12), 'Asia/Phnom_Penh').km.time, '១០:០០ ព្រឹក – ១២:០០ ថ្ងៃត្រង់')
  assert.match(eventDisplay(at(14), at(15), 'Asia/Phnom_Penh').en.time, /^2:00\s–\s3:00\sPM$/)
})

test('written-out Khmer date parts match ICU, so browsers without Khmer data render what the server did', () => {
  for (let i = 0; i < 400; i += 7) {
    const date = new Date(Date.UTC(2027, 0, 1 + i, 3))
    const icu = new Intl.DateTimeFormat('km-KH-u-nu-khmr', { timeZone: 'Asia/Phnom_Penh', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(date)
    const p = (t: string) => icu.find(x => x.type === t)!.value
    assert.deepEqual(localDateParts(date, 'km', 'Asia/Phnom_Penh'), { weekday: p('weekday'), day: p('day'), month: p('month'), year: p('year') })
  }
  assert.equal(localDateParts(new Date('2027-01-01T00:00:00Z'), 'en', 'Asia/Phnom_Penh').weekday, 'Friday')
})
