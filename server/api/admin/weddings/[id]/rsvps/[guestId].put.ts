// Records an RSVP on a guest's behalf (e.g. they replied by phone).
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const guest = await requireChild<Guest>('guests', getRouterParam(event, 'guestId')!, wedding.id)
  const body = await readBody$(event, manualRsvpSchema)
  const count = body.attending ? body.count : 0
  if (body.attending && (count < 1 || count > guest.maxAttendees)) {
    throw createError({ statusCode: 400, statusMessage: `Between 1 and ${guest.maxAttendees} attendees` })
  }
  const now = nowIso()
  return useDb().transaction(async (tx) => {
    const existing = await tx.get<Rsvp>('rsvps', guest.id)
    const rsvp: Rsvp = {
      id: guest.id, weddingId: wedding.id, guestId: guest.id, invitationId: existing?.invitationId ?? '', source: 'admin',
      name: guest.name, ...body, count, attendeeNames: body.attendeeNames.slice(0, count),
      submittedAt: existing?.submittedAt ?? now, updatedAt: now,
    }
    tx.set('rsvps', rsvp.id, rsvp)
    return rsvp
  })
})
