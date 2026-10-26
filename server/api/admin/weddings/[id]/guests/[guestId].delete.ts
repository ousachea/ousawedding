// Permanent delete. Only archived guests can be deleted, so it always takes two deliberate steps.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const guest = await requireChild<Guest>('guests', getRouterParam(event, 'guestId')!, wedding.id)
  if (!guest.archived) throw createError({ statusCode: 409, statusMessage: 'Archive the guest before deleting' })
  const db = useDb()
  for (const inv of await db.where<Invitation>('invitations', 'guestId', guest.id)) await db.delete('invitations', inv.id)
  await db.delete('rsvps', guest.id)
  await db.delete('guests', guest.id)
  return { ok: true }
})
