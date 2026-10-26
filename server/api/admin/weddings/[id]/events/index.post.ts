export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const body = await readBody$(event, eventSchema)
  const existing = await useDb().where<WeddingEvent>('events', 'weddingId', wedding.id)
  const now = nowIso()
  const item: WeddingEvent = { id: newId(), weddingId: wedding.id, ...body, order: existing.length, createdAt: now, updatedAt: now }
  await useDb().set('events', item.id, item)
  return item
})
