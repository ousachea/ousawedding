// Creates a new wedding from the sample template.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { slug } = await readBody$(event, weddingSchema.pick({ slug: true }))
  if (await findWeddingBySlug(slug)) throw createError({ statusCode: 409, statusMessage: 'That address is already used' })
  const { wedding, events } = sampleWedding(slug)
  const db = useDb()
  await db.set('weddings', wedding.id, wedding)
  await db.setMany('events', events.map(e => ({ id: e.id, data: e })))
  return wedding
})
