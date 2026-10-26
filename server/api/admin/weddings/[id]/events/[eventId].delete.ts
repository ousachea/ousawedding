export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const item = await requireChild<WeddingEvent>('events', getRouterParam(event, 'eventId')!, wedding.id)
  await useDb().delete('events', item.id)
  return { ok: true }
})
