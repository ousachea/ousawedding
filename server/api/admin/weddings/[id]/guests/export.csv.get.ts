export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const guests = await useDb().where<Guest>('guests', 'weddingId', wedding.id)
  const rows = guests.sort((a, b) => a.name.localeCompare(b.name)).map(g => ({
    name: g.name, side: g.side, group: g.group, household: g.householdId, allowed: g.maxAttendees, spouse: g.spouse ?? '',
    phone: g.phone, email: g.email, archived: g.archived ? 'yes' : '', notes: g.notes,
    invitation_link: inviteLink(wedding, g.name, useRuntimeConfig().public.siteUrl, 'en', g.spouse),
  }))
  return sendCsv(event, `${wedding.slug}-guests.csv`, rows)
})
