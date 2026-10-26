// Full JSON export of one wedding (content and guest list), for backups.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const db = useDb()
  const [events, gallery, guests] = await Promise.all([
    db.where('events', 'weddingId', wedding.id),
    db.where('gallery', 'weddingId', wedding.id),
    db.where('guests', 'weddingId', wedding.id),
  ])
  setResponseHeader(event, 'content-disposition', `attachment; filename="${wedding.slug}-backup-${nowIso().slice(0, 10)}.json"`)
  return { version: 2, exportedAt: nowIso(), wedding, events, gallery, guests }
})
