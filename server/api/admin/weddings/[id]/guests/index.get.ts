// The guest list, for the admin table and personal invitation links.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  return { guests: await useDb().where<Guest>('guests', 'weddingId', wedding.id) }
})
