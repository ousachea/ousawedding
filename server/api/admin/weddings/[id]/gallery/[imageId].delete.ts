export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const item = await requireChild<GalleryImage>('gallery', getRouterParam(event, 'imageId')!, wedding.id)
  const storage = useFileStorage()
  await Promise.all([item.storagePath, item.thumbPath].filter(Boolean).map(p => storage.remove(p)))
  await useDb().delete('gallery', item.id)
  if (wedding.coverImage === item.url) await useDb().update('weddings', wedding.id, { coverImage: '', updatedAt: nowIso() })
  return { ok: true }
})
