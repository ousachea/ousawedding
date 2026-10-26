export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const { ids } = await readBody$(event, reorderSchema)
  const own = new Set((await useDb().where<GalleryImage>('gallery', 'weddingId', wedding.id)).map(g => g.id))
  const now = nowIso()
  await useDb().setMany('gallery', ids.filter(id => own.has(id)).map((id, order) => ({ id, data: { order, updatedAt: now } })))
  return { ok: true }
})
