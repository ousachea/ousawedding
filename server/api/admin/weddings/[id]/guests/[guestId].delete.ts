// Permanent delete. Only archived guests can be deleted, so it always takes two deliberate steps.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const guest = await requireChild<Guest>('guests', getRouterParam(event, 'guestId')!, wedding.id)
  if (!guest.archived) throw createError({ statusCode: 409, statusMessage: 'Archive the guest before deleting' })
  await useDb().delete('guests', guest.id)
  return { ok: true }
})
