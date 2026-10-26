// Calendar file for one event, so guests can "Add to calendar" on any device.
export default defineEventHandler(async (event) => {
  const wedding = await findWeddingBySlug(getRouterParam(event, 'slug')!)
  if (!wedding?.published) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  // Route is /events/<id>.ics; the router can't match a suffix after a param, so strip it here
  const file = getRouterParam(event, 'file') ?? ''
  if (!file.endsWith('.ics')) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const item = await requireChild<WeddingEvent>('events', file.slice(0, -4), wedding.id)
  const locale: Locale = getQuery(event).lang === 'en' ? 'en' : 'km'

  const stamp = (local: string) => zonedTimeToUtc(local, wedding.timezone).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/[\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n')
  const names = wedding.names[locale]
  const page = `${getRequestURL(event).origin}/${locale === 'en' ? 'en/' : ''}wedding/${wedding.slug}`

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${item.id}@${getRequestHost(event)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${stamp(item.start)}`,
    `DTEND:${stamp(item.end)}`,
    `SUMMARY:${esc(`${item.title[locale]} · ${names.partner1} & ${names.partner2}`)}`,
    `LOCATION:${esc([item.venue[locale], item.address[locale]].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc([item.description[locale], item.mapUrl, page].filter(Boolean).join('\n'))}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')

  setResponseHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'content-disposition', `attachment; filename="${wedding.slug}-${item.order + 1}.ics"`)
  return ics
})
