export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const item = await requireChild<GalleryImage>('gallery', getRouterParam(event, 'imageId')!, wedding.id)
  const storage = useFileStorage()
  await Promise.all([item.storagePath, item.thumbPath].filter(Boolean).map(p => storage.remove(p)))
  await useDb().delete('gallery', item.id)
  // Clear every place that used it, so the invitation shows no broken image
  if (wedding.coverImage === item.url) await useDb().update('weddings', wedding.id, { coverImage: '', updatedAt: nowIso() })
  const events = await useDb().where<WeddingEvent>('events', 'weddingId', wedding.id)
  await Promise.all(events.filter(e => e.imageUrl === item.url).map(e => useDb().update('events', e.id, { imageUrl: '', updatedAt: nowIso() })))
  return { ok: true }
})
