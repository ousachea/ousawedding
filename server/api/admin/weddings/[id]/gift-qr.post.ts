// KHQR image upload for the gift section: stored as a plain file (not resized, so the code stays sharp).
// Returns its address; Settings puts it in the draft and it is kept when the wedding is saved.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const parts = await readMultipartFormData(event)
  const image = parts?.find(p => p.name === 'image')
  if (!image?.data.length) throw createError({ statusCode: 400, statusMessage: 'Send a PNG, JPEG or WebP image' })
  if (image.data.length > 5 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'Image too large (5 MB max)' })
  // Check magic bytes so the declared type can't be spoofed
  const b = image.data
  const ext = b[0] === 0x89 && b.subarray(1, 4).toString() === 'PNG' ? 'png'
    : b[0] === 0xFF && b[1] === 0xD8 ? 'jpg'
      : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'webp' : ''
  if (!ext) throw createError({ statusCode: 400, statusMessage: 'File is not a PNG, JPEG or WebP image' })

  const type = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' }[ext]
  const url = await useFileStorage().put(`weddings/${wedding.id}/gifts/${newId()}.${ext}`, b, type)
  return { url }
})
