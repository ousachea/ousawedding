// Public wedding content. Contains no guest data, so it is safe to server-render.
export default defineEventHandler(async (event) => {
  const wedding = await findWeddingBySlug(getRouterParam(event, 'slug')!)
  let preview = false
  if (wedding && !wedding.published) {
    // Admins can preview an unpublished invitation
    const admin = await getAdmin(event)
    preview = !!admin && canAccessWedding(admin, wedding.id)
  }
  if (!wedding || (!wedding.published && !preview)) {
    throw createError({ statusCode: 404, statusMessage: 'Wedding not found' })
  }
  return buildPublicWedding(wedding, preview)
})
