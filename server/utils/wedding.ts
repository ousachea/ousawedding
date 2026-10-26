const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

export async function findWeddingBySlug(slug: string): Promise<Wedding | null> {
  const [wedding] = await useDb().where<Wedding>('weddings', 'slug', slug)
  return wedding ?? null
}

export async function buildPublicWedding(wedding: Wedding): Promise<PublicWedding> {
  const db = useDb()
  const [events, gallery] = await Promise.all([
    db.where<WeddingEvent>('events', 'weddingId', wedding.id),
    db.where<GalleryImage>('gallery', 'weddingId', wedding.id),
  ])
  const tz = wedding.timezone
  const { createdAt, updatedAt, ...publicFields } = wedding

  // Dates are formatted here so server and client render identical text (no hydration mismatch)
  return {
    wedding: publicFields,
    ...weddingDates(wedding.date, wedding.rsvp.deadline, tz),
    events: events.sort(byOrder).map((e) => {
      const start = zonedTimeToUtc(e.start, tz)
      const end = zonedTimeToUtc(e.end, tz)
      return { ...e, startUtc: start.toISOString(), endUtc: end.toISOString(), display: eventDisplay(start, end, tz) }
    }),
    gallery: gallery.filter(g => g.visible).sort(byOrder)
      .map(({ id, url, thumbUrl, width, height, caption, alt }) => ({ id, url, thumbUrl, width, height, caption, alt })),
  }
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0]!)
  const cell = (v: unknown) => {
    let s = Array.isArray(v) ? v.join('; ') : String(v ?? '')
    // Stop spreadsheet apps from running guest-supplied text as a formula
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // BOM so Excel opens Khmer text as UTF-8
  return '﻿' + [headers.join(','), ...rows.map(r => headers.map(h => cell(r[h])).join(','))].join('\r\n')
}

export function sendCsv(event: Parameters<typeof setResponseHeader>[0], filename: string, rows: Array<Record<string, unknown>>) {
  setResponseHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setResponseHeader(event, 'content-disposition', `attachment; filename="${filename}"`)
  return toCsv(rows)
}

export const nowIso = () => new Date().toISOString()
