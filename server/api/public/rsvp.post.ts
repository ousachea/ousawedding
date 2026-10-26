// Saves an RSVP. All limits are enforced here; the form's checks are only for convenience.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'rsvp', 10, 60_000)
  const body = await readBody$(event, rsvpSchema)
  const wedding = await findWeddingBySlug(body.slug)
  if (!wedding?.published) throw createError({ statusCode: 404, statusMessage: 'Wedding not found' })
  if (deadlinePassed(wedding)) throw createError({ statusCode: 409, statusMessage: 'RSVP deadline has passed', data: { code: 'deadline' } })

  const now = nowIso()
  const db = useDb()

  if (body.token) {
    const found = await findInvitation(wedding, body.token)
    if (!found) throw invalidInvitation()
    const { invitation, guest } = found
    const count = validCount(body.attending, body.count, guest.maxAttendees)

    return db.transaction(async (tx) => {
      // Keyed by guest ID, so repeated or concurrent submissions update one record
      const existing = await tx.get<Rsvp>('rsvps', guest.id)
      if (existing && !wedding.rsvp.allowUpdates) {
        throw createError({ statusCode: 409, statusMessage: 'RSVP already received', data: { code: 'locked' } })
      }
      const rsvp: Rsvp = {
        id: guest.id, weddingId: wedding.id, guestId: guest.id, invitationId: invitation.id, source: 'invitation',
        name: guest.name, attending: body.attending, count,
        attendeeNames: body.attending ? body.attendeeNames.filter(Boolean).slice(0, count) : [],
        dietary: wedding.rsvp.askDietary ? body.dietary : '', message: body.message,
        submittedAt: existing?.submittedAt ?? now, updatedAt: now,
      }
      tx.set('rsvps', rsvp.id, rsvp)
      tx.set('invitations', invitation.id, { ...invitation, status: 'responded', viewedAt: invitation.viewedAt || now, updatedAt: now })
      return { ok: true, updated: !!existing, count }
    })
  }

  if (!wedding.rsvp.allowGeneral) throw invalidInvitation()
  rateLimit(event, 'rsvp-general', 5, 10 * 60_000)
  const name = body.name
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: { issues: [{ path: 'name', message: 'Required' }] } })
  const count = validCount(body.attending, body.count, wedding.rsvp.generalMaxAttendees)
  const id = `general_${body.submissionId ?? newId()}`

  return db.transaction(async (tx) => {
    const existing = await tx.get<Rsvp>('rsvps', id)
    // A retried submission may only overwrite its own record
    if (existing && (existing.weddingId !== wedding.id || existing.source !== 'general')) throw invalidInvitation()
    tx.set('rsvps', id, {
      id, weddingId: wedding.id, guestId: '', invitationId: '', source: 'general',
      name, attending: body.attending, count,
      attendeeNames: body.attending ? body.attendeeNames.filter(Boolean).slice(0, count) : [],
      dietary: wedding.rsvp.askDietary ? body.dietary : '', message: body.message,
      submittedAt: existing?.submittedAt ?? now, updatedAt: now,
    } satisfies Rsvp)
    return { ok: true, updated: !!existing, count }
  })
})

function validCount(attending: boolean, count: number, max: number) {
  if (!attending) return 0
  if (count < 1 || count > max) {
    throw createError({ statusCode: 400, statusMessage: 'Too many attendees', data: { code: 'limit', max } })
  }
  return count
}
