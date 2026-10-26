export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const { ids } = await readBody$(event, reorderSchema)
  const own = new Set((await useDb().where<WeddingEvent>('events', 'weddingId', wedding.id)).map(e => e.id))
  const now = nowIso()
  await useDb().setMany('events', ids.filter(id => own.has(id)).map((id, order) => ({ id, data: { order, updatedAt: now } })))
  return { ok: true }
})
