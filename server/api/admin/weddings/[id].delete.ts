import { promises as fs } from 'node:fs'

// Deletes a couple: their wedding, schedule, photos, guest list and every uploaded file (photos, KHQR, music)
export default defineEventHandler(async (event) => {
  const { admin, wedding } = await requireWedding(event)
  if (admin.role !== 'owner') throw createError({ statusCode: 403, statusMessage: 'Only the owner can delete a couple' })
  const db = useDb()
  for (const col of ['events', 'gallery', 'guests'] as const) {
    for (const doc of await db.where<{ id: string }>(col, 'weddingId', wedding.id)) await db.delete(col, doc.id)
  }
  await db.delete('weddings', wedding.id)
  await fs.rm(uploadPath(`weddings/${wedding.id}`), { recursive: true, force: true })
  return null
})
