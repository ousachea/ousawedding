export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const body = await readBody$(event, guestSchema)
  const now = nowIso()
  const guest: Guest = { id: newId(), weddingId: wedding.id, ...body, archived: false, createdAt: now, updatedAt: now }
  await useDb().set('guests', guest.id, guest)
  return guest
})
