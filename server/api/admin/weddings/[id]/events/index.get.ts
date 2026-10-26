export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  return (await useDb().where<WeddingEvent>('events', 'weddingId', wedding.id)).sort((a, b) => a.order - b.order)
})
