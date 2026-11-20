// Saves the business page's details
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const site = await readBody$(event, siteSchema)
  await useDb().set('site', 'main', site)
  return site
})
