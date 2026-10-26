// Full JSON export of one wedding, for backups. Invitation tokens stay encrypted.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event, 'owner')
  const db = useDb()
  const [data, events, gallery] = await Promise.all([
    loadWeddingData(wedding.id),
    db.where('events', 'weddingId', wedding.id),
    db.where('gallery', 'weddingId', wedding.id),
  ])
  setResponseHeader(event, 'content-disposition', `attachment; filename="${wedding.slug}-backup-${nowIso().slice(0, 10)}.json"`)
  return { version: 1, exportedAt: nowIso(), wedding, events, gallery, ...data }
})
