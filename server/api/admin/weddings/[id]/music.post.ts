// Background music upload: stored as a plain file and set as the wedding's music, replacing an earlier upload
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const parts = await readMultipartFormData(event)
  const music = parts?.find(p => p.name === 'music')
  if (!music?.data.length) throw createError({ statusCode: 400, statusMessage: 'Send an MP3 or M4A file' })
  if (music.data.length > 20 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Music file too large (20 MB max)' })
  // Check magic bytes so the declared type can't be spoofed: MP3 (ID3 tag or frame sync) or M4A (ftyp box)
  const b = music.data
  const ext = b.subarray(0, 3).toString() === 'ID3' || (b[0] === 0xFF && (b[1]! & 0xE0) === 0xE0) ? 'mp3'
    : b.subarray(4, 8).toString() === 'ftyp' ? 'm4a' : ''
  if (!ext) throw createError({ statusCode: 400, statusMessage: 'File is not an MP3 or M4A' })

  const storage = useFileStorage()
  const folder = `weddings/${wedding.id}/music/`
  const url = await storage.put(`${folder}${newId()}.${ext}`, b, ext === 'mp3' ? 'audio/mpeg' : 'audio/mp4')
  if (wedding.musicUrl.startsWith(`/uploads/${folder}`)) await storage.remove(wedding.musicUrl.slice('/uploads/'.length))
  const updated: Wedding = { ...wedding, musicUrl: url, updatedAt: nowIso() }
  await useDb().set('weddings', wedding.id, updated)
  return updated
})
