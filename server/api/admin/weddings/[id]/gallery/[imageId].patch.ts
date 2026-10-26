export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const item = await requireChild<GalleryImage>('gallery', getRouterParam(event, 'imageId')!, wedding.id)
  const body = await readBody$(event, galleryPatchSchema)
  const updated = { ...item, ...Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)), updatedAt: nowIso() }
  await useDb().set('gallery', item.id, updated)
  return updated
})
