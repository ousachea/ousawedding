// Every wedding in the content.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return (await useDb().all<Wedding>('weddings'))
    .map(w => ({ id: w.id, slug: w.slug, names: w.names, date: w.date }))
    .sort((a, b) => a.date.localeCompare(b.date))
})
