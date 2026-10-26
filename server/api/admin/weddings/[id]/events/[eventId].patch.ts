export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const item = await requireChild<WeddingEvent>('events', getRouterParam(event, 'eventId')!, wedding.id)
  const body = await readBody$(event, eventSchema)
  const updated = { ...item, ...body, updatedAt: nowIso() }
  await useDb().set('events', item.id, updated)
  return updated
})
