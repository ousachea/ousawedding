const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order

export async function findWeddingBySlug(slug: string): Promise<Wedding | null> {
  const [wedding] = await useDb().where<Wedding>('weddings', 'slug', slug)
  return wedding ?? null
}

export function deadlinePassed(wedding: Wedding, now = new Date()) {
  return now > zonedTimeToUtc(wedding.rsvp.deadline, wedding.timezone)
}

export async function buildPublicWedding(wedding: Wedding, preview: boolean): Promise<PublicWedding> {
  const db = useDb()
  const [events, gallery] = await Promise.all([
    db.where<WeddingEvent>('events', 'weddingId', wedding.id),
    db.where<GalleryImage>('gallery', 'weddingId', wedding.id),
  ])
  const tz = wedding.timezone
  const { createdAt, updatedAt, published, ...publicFields } = wedding

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
    preview,
  }
}

/** Finds a usable invitation for a token. Every failure looks the same to the caller. */
export async function findInvitation(wedding: Wedding, token: string | undefined) {
  if (!token || token.length > 100) return null
  const [invitation] = await useDb().where<Invitation>('invitations', 'tokenHash', hashInviteToken(token))
  if (!invitation || invitation.weddingId !== wedding.id || invitation.status === 'revoked') return null
  if (invitation.expiresAt && new Date(invitation.expiresAt) < new Date()) return null
  const guest = await useDb().get<Guest>('guests', invitation.guestId)
  if (!guest || guest.archived) return null
  return { invitation, guest }
}

export const invalidInvitation = () => createError({ statusCode: 404, statusMessage: 'Invitation not found' })

export function inviteUrl(event: Parameters<typeof getRequestURL>[0], wedding: Wedding, token: string, locale: Locale) {
  const base = useRuntimeConfig().public.siteUrl || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
  const prefix = locale === 'km' ? '' : `/${locale}`
  return `${base.replace(/\/$/, '')}${prefix}/${wedding.slug}?invite=${token}`
}

export async function loadWeddingData(weddingId: string) {
  const db = useDb()
  const [guests, invitations, rsvps] = await Promise.all([
    db.where<Guest>('guests', 'weddingId', weddingId),
    db.where<Invitation>('invitations', 'weddingId', weddingId),
    db.where<Rsvp>('rsvps', 'weddingId', weddingId),
  ])
  return { guests, invitations, rsvps }
}

export function computeStats({ guests, invitations, rsvps }: Awaited<ReturnType<typeof loadWeddingData>>): WeddingStats {
  const active = guests.filter(g => !g.archived)
  const activeIds = new Set(active.map(g => g.id))
  const invited = invitations.filter(i => i.status !== 'revoked' && activeIds.has(i.guestId))
  const responses = rsvps.filter(r => !r.guestId || activeIds.has(r.guestId))
  const responded = new Set(responses.filter(r => r.guestId).map(r => r.guestId))
  const attending = responses.filter(r => r.attending)
  return {
    guests: active.length,
    households: new Set(active.map(g => g.householdId || g.id)).size,
    invitations: invited.length,
    invitedPeople: active.reduce((n, g) => n + g.maxAttendees, 0),
    attendingPeople: attending.reduce((n, r) => n + r.count, 0),
    attendingResponses: attending.length,
    declined: responses.filter(r => !r.attending).length,
    pending: active.filter(g => !responded.has(g.id)).length,
    viewed: invited.filter(i => i.viewedAt).length,
    responseRate: active.length ? Math.round((responded.size / active.length) * 100) : 0,
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
