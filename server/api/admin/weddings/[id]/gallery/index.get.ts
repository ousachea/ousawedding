export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  return (await useDb().where<GalleryImage>('gallery', 'weddingId', wedding.id)).sort((a, b) => a.order - b.order)
})
