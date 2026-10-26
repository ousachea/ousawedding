// Public wedding content (no guest data). Read at build time, when the static site is generated.
export default defineEventHandler(async (event) => {
  const wedding = await findWeddingBySlug(getRouterParam(event, 'slug')!)
  if (!wedding) throw createError({ statusCode: 404, statusMessage: 'Wedding not found' })
  return buildPublicWedding(wedding)
})
