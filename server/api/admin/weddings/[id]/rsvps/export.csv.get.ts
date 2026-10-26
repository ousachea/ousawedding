export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const { guests, rsvps } = await loadWeddingData(wedding.id)
  const guestById = new Map(guests.map(g => [g.id, g]))
  const rows = rsvps.sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).map(r => ({
    name: r.name, group: guestById.get(r.guestId)?.group ?? '', source: r.source,
    attending: r.attending ? 'yes' : 'no', count: r.count, attendee_names: r.attendeeNames,
    dietary: r.dietary, message: r.message, submitted: r.submittedAt, updated: r.updatedAt,
  }))
  return sendCsv(event, `${wedding.slug}-rsvps.csv`, rows)
})
