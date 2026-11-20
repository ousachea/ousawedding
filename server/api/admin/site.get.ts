// The business page's details, for editing
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return getSite()
})
