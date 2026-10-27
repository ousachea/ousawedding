// Link-preview image: the browser crops the cover photo to 1200×630 around the chosen point and sends it here
// as a JPEG (the format every chat app shows). Replaces the earlier one.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const parts = await readMultipartFormData(event)
  const field = (name: string) => parts?.find(p => p.name === name)
  const image = field('image')
  const cover = field('cover')?.data.toString() ?? ''
  const position = field('position')?.data.toString() ?? ''
  if (!image?.data.length || image.data.subarray(0, 3).toString('hex') !== 'ffd8ff') {
    throw createError({ statusCode: 400, statusMessage: 'Send a JPEG image' })
  }
  if (image.data.length > 2 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Image too large' })
  if (!/^\d{1,3}(\.\d)?% \d{1,3}(\.\d)?%$/.test(position) || !cover || cover.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input' })
  }

  const storage = useFileStorage()
  const folder = `weddings/${wedding.id}/share/`
  const url = await storage.put(`${folder}${newId()}.jpg`, image.data, 'image/jpeg')
  if (wedding.shareImage?.url.startsWith(`/uploads/${folder}`)) await storage.remove(wedding.shareImage.url.slice('/uploads/'.length))
  const updated: Wedding = { ...wedding, shareImage: { url, cover, position }, updatedAt: nowIso() }
  await useDb().set('weddings', wedding.id, updated)
  return updated
})
