// Clears a guest's RSVP so they show as pending again.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const id = getRouterParam(event, 'guestId')!
  await requireChild<Rsvp>('rsvps', id, wedding.id)
  await useDb().delete('rsvps', id)
  return { ok: true }
})
