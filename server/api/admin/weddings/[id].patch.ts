// Saves wedding content, theme and settings.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const patch = await readBody$(event, weddingSchema.partial())
  if (patch.slug && patch.slug !== wedding.slug && await findWeddingBySlug(patch.slug)) {
    throw createError({ statusCode: 409, statusMessage: 'That address is already used' })
  }
  const updated: Wedding = { ...wedding, ...patch, updatedAt: nowIso() }
  // Editing real details means the content is no longer sample data
  if (patch.names || patch.date || patch.content) updated.isSample = false
  await useDb().set('weddings', wedding.id, updated)
  return updated
})
