// Saves wedding content, theme and settings.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const patch = await readBody$(event, weddingSchema.partial())
  if (patch.slug && patch.slug !== wedding.slug && await findWeddingBySlug(patch.slug)) {
    throw createError({ statusCode: 409, statusMessage: 'That address is already used' })
  }
  const updated: Wedding = { ...wedding, ...patch, updatedAt: nowIso() }
  // Editing real details means the content is no longer sample data
  if (patch.names || patch.date || patch.content) updated.isSample = false
  // The wedding date is the big day: moving it moves the RSVP deadline (unless set in the same save)
  // and the whole schedule by the same amount
  const minutes = patch.date && patch.date !== wedding.date ? minutesBetween(wedding.date, patch.date) : 0
  if (minutes && !patch.rsvp) updated.rsvp = { ...wedding.rsvp, deadline: shiftLocal(wedding.rsvp.deadline, minutes) }
  const db = useDb()
  await db.set('weddings', wedding.id, updated)
  if (minutes) {
    const events = await db.where<WeddingEvent>('events', 'weddingId', wedding.id)
    await db.setMany('events', events.map(e => ({
      id: e.id,
      data: { ...e, start: shiftLocal(e.start, minutes), end: shiftLocal(e.end, minutes), updatedAt: updated.updatedAt },
    })))
  }
  return updated
})
