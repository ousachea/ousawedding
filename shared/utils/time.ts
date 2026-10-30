/**
 * Converts a local date-time ("2027-02-14T16:00") in an IANA timezone to a UTC Date,
 * using Intl so it is correct across DST changes without a date library.
 */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  const [datePart, timePart = '00:00'] = local.split('T')
  const [y, mo, d] = datePart!.split('-').map(Number)
  const [h, mi] = timePart.split(':').map(Number)
  const guess = Date.UTC(y!, mo! - 1, d!, h, mi)
  // Two passes handle the rare case where the offset differs on either side of the guess
  let utc = guess - tzOffsetMs(new Date(guess), timeZone)
  utc = guess - tzOffsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find(p => p.type === type)!.value)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

// Khmer uses Khmer digits: Latin digits look much smaller than Khmer letters beside them
const intlLocale = { km: 'km-KH-u-nu-khmr', en: 'en-US' } as const

// Khmer names and digits written out, for text the browser also renders: some browsers have no Khmer
// date data in Intl and would print English instead, which breaks hydration. Same names as ICU's km locale.
export const KM_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']
// Sunday first, like Date.getUTCDay()
export const KM_WEEKDAYS = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍']
export const KM_WEEKDAYS_SHORT = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហ', 'សុក្រ', 'សៅរ៍']
export const kmDigits = (s: string | number) => String(s).replace(/\d/g, d => '០១២៣៤៥៦៧៨៩'[Number(d)]!)

/** The calendar day of `date` in `timeZone`, with names in `locale`; the same in every browser. */
export function localDateParts(date: Date, locale: 'km' | 'en', timeZone: string) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone }).format(date).split('-').map(Number) as [number, number, number]
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  if (locale === 'km') return { weekday: KM_WEEKDAYS[day]!, day: kmDigits(d), month: KM_MONTHS[m - 1]!, year: kmDigits(y) }
  const en = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...o, timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d))
  return { weekday: en({ weekday: 'long' }), day: String(d), month: en({ month: 'long' }), year: String(y) }
}

export function formatDate(date: Date, locale: 'km' | 'en', timeZone: string): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date)
}

export function formatTime(date: Date, locale: 'km' | 'en', timeZone: string): string {
  if (locale === 'km') return `${khmerClock(date, timeZone)} ${khmerPeriod(date, timeZone)}`
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone, hour: 'numeric', minute: '2-digit' }).format(date)
}

// Khmer times read like a printed invitation: "៧:០០ ព្រឹក", with the time of day as a word instead of AM/PM
function khmerClock(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat(intlLocale.km, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
    .formatToParts(date).filter(p => p.type === 'hour' || p.type === 'minute' || (p.type === 'literal' && p.value.trim() === ':'))
    .map(p => p.value).join('')
}
function khmerPeriod(date: Date, timeZone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(date))
  return hour < 12 ? 'ព្រឹក' : hour < 13 ? 'ថ្ងៃត្រង់' : hour < 17 ? 'រសៀល' : hour < 19 ? 'ល្ងាច' : 'យប់'
}

/** The wedding's date fields as shown on the invitation. Shared so the admin preview matches the server. */
export function weddingDates(date: string, deadline: string, timeZone: string, now = new Date()) {
  const d = zonedTimeToUtc(date, timeZone)
  const dl = zonedTimeToUtc(deadline, timeZone)
  const show = (locale: 'km' | 'en') => ({ date: formatDate(d, locale, timeZone), time: formatTime(d, locale, timeZone), deadline: formatDate(dl, locale, timeZone) })
  return { dateUtc: d.toISOString(), deadlineUtc: dl.toISOString(), deadlinePassed: now > dl, display: { km: show('km'), en: show('en') } }
}

/** A schedule item's day and time range as shown on the invitation; the range is shortened ("2:00 – 3:00 PM"). */
export function eventDisplay(start: Date, end: Date, timeZone: string) {
  const range = (locale: 'km' | 'en') => {
    if (locale === 'en') return new Intl.DateTimeFormat(intlLocale.en, { timeZone, hour: 'numeric', minute: '2-digit' }).formatRange(start, end)
    // "២:០០ – ៣:០០ រសៀល", or both words when the period changes ("១០:០០ ព្រឹក – ១២:០០ ថ្ងៃត្រង់")
    const [p1, p2] = [khmerPeriod(start, timeZone), khmerPeriod(end, timeZone)]
    return p1 === p2 ? `${khmerClock(start, timeZone)} – ${khmerClock(end, timeZone)} ${p1}` : `${formatTime(start, 'km', timeZone)} – ${formatTime(end, 'km', timeZone)}`
  }
  const show = (locale: 'km' | 'en') => ({ date: formatDate(start, locale, timeZone), time: range(locale) })
  return { km: show('km'), en: show('en') }
}

/** Wall-clock minutes from one local date-time ("2027-01-31T07:00") to another. */
export function minutesBetween(from: string, to: string): number {
  return (Date.parse(`${to}:00Z`) - Date.parse(`${from}:00Z`)) / 60_000
}

/** Moves a local date-time by some minutes of wall-clock time, keeping the "YYYY-MM-DDTHH:mm" form. */
export function shiftLocal(local: string, minutes: number): string {
  return new Date(Date.parse(`${local}:00Z`) + minutes * 60_000).toISOString().slice(0, 16)
}
