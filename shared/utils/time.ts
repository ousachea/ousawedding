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

const intlLocale = { km: 'km-KH', en: 'en-US' } as const

export function formatDate(date: Date, locale: 'km' | 'en', timeZone: string): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(date)
}

export function formatTime(date: Date, locale: 'km' | 'en', timeZone: string): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { timeZone, hour: 'numeric', minute: '2-digit' }).format(date)
}

/** The wedding's date fields as shown on the invitation. Shared so the admin preview matches the server. */
export function weddingDates(date: string, deadline: string, timeZone: string, now = new Date()) {
  const d = zonedTimeToUtc(date, timeZone)
  const dl = zonedTimeToUtc(deadline, timeZone)
  const show = (locale: 'km' | 'en') => ({ date: formatDate(d, locale, timeZone), time: formatTime(d, locale, timeZone), deadline: formatDate(dl, locale, timeZone) })
  return { dateUtc: d.toISOString(), deadlineUtc: dl.toISOString(), deadlinePassed: now > dl, display: { km: show('km'), en: show('en') } }
}

/** A schedule item's day and time range as shown on the invitation. */
export function eventDisplay(start: Date, end: Date, timeZone: string) {
  const show = (locale: 'km' | 'en') => ({ date: formatDate(start, locale, timeZone), time: `${formatTime(start, locale, timeZone)} – ${formatTime(end, locale, timeZone)}` })
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
