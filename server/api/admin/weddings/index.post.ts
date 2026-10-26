// Creates a new wedding from the sample template. Owners only.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  if (admin.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Not allowed' })
  const { slug } = await readBody$(event, weddingSchema.pick({ slug: true }))
  if (await findWeddingBySlug(slug)) throw createError({ statusCode: 409, statusMessage: 'That address is already used' })

  const { wedding, events } = sampleWedding(slug)
  wedding.published = false
  const db = useDb()
  await db.set('weddings', wedding.id, wedding)
  await db.setMany('events', events.map(e => ({ id: e.id, data: e })))
  if (!admin.weddingIds.includes('*')) {
    await db.update('admins', admin.id, { weddingIds: [...admin.weddingIds, wedding.id] })
  }
  return wedding
})
