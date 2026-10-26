// Weddings this admin can manage.
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const db = useDb()
  // Equality-only queries can't list a whole collection, so all-access admins list via the published flag
  const all = admin.weddingIds.includes('*')
    ? [...await db.where<Wedding>('weddings', 'published', true), ...await db.where<Wedding>('weddings', 'published', false)]
    : (await Promise.all(admin.weddingIds.map(id => db.get<Wedding>('weddings', id)))).filter(w => !!w)
  return all
    .map(w => ({ id: w.id, slug: w.slug, names: w.names, date: w.date, published: w.published }))
    .sort((a, b) => a.date.localeCompare(b.date))
})
