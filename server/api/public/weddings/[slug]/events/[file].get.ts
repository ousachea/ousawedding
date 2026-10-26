// Calendar file with the whole schedule, so guests can "Add to calendar" on any device:
// /events/all.ics (Khmer) and /events/all-en.ics (English). Built as static files with the site.
export default defineEventHandler(async (event) => {
  const wedding = await findWeddingBySlug(getRouterParam(event, 'slug')!)
  const file = getRouterParam(event, 'file')
  if (!wedding || (file !== 'all.ics' && file !== 'all-en.ics')) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const items = (await useDb().where<WeddingEvent>('events', 'weddingId', wedding.id)).sort((a, b) => a.order - b.order)
  const locale: Locale = file === 'all-en.ics' ? 'en' : 'km'

  const stamp = (local: string) => zonedTimeToUtc(local, wedding.timezone).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const esc = (s: string) => s.replace(/[\;,]/g, m => `\\${m}`).replace(/\n/g, '\\n')
  const names = wedding.names[locale]
  const origin = useRuntimeConfig().public.siteUrl.replace(/\/$/, '') || getRequestURL(event).origin
  const page = `${origin}/${locale === 'en' ? 'en/' : ''}${wedding.slug}`

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...items.flatMap(item => [
      'BEGIN:VEVENT',
      `UID:${item.id}@${wedding.slug}`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
      `DTSTART:${stamp(item.start)}`,
      `DTEND:${stamp(item.end)}`,
      `SUMMARY:${esc(`${item.title[locale]} · ${names.partner1} & ${names.partner2}`)}`,
      `LOCATION:${esc([item.venue[locale], item.address[locale]].filter(Boolean).join(', '))}`,
      `DESCRIPTION:${esc([item.description[locale], item.mapUrl, page].filter(Boolean).join('\n'))}`,
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ].join('\r\n')

  setResponseHeader(event, 'content-type', 'text/calendar; charset=utf-8')
  setResponseHeader(event, 'content-disposition', `attachment; filename="${wedding.slug}-schedule.ics"`)
  return ics
})
