// Upload. The browser resizes photos first and sends a full image plus a thumbnail,
// which keeps uploads under serverless body limits and pages fast on mobile data.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const parts = await readMultipartFormData(event)
  const field = (name: string) => parts?.find(p => p.name === name)
  const image = field('image')
  const thumb = field('thumb')
  const allowed = ['image/webp', 'image/jpeg', 'image/png']
  if (!image?.data.length || !thumb?.data.length || !allowed.includes(image.type ?? '') || !allowed.includes(thumb.type ?? '')) {
    throw createError({ statusCode: 400, statusMessage: 'Send an image and a thumbnail (WebP, JPEG or PNG)' })
  }
  if (image.data.length > 4 * 1024 * 1024 || thumb.data.length > 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: 'Image too large' })
  }
  // Check magic bytes so the declared type can't be spoofed
  const sniff = (b: Buffer) => b.subarray(0, 4).toString('hex') === '89504e47' ? 'image/png'
    : b.subarray(0, 3).toString('hex') === 'ffd8ff' ? 'image/jpeg'
      : b.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : ''
  if (sniff(image.data) !== image.type || sniff(thumb.data) !== thumb.type) {
    throw createError({ statusCode: 400, statusMessage: 'File is not a valid image' })
  }
  const num = (name: string) => Math.min(Math.max(Number(field(name)?.data.toString()) || 0, 1), 10_000)
  const ext = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' } as const
  const id = newId()
  const storage = useFileStorage()
  const storagePath = `weddings/${wedding.id}/gallery/${id}.${ext[image.type as keyof typeof ext]}`
  const thumbPath = `weddings/${wedding.id}/gallery/${id}_thumb.${ext[thumb.type as keyof typeof ext]}`
  const [url, thumbUrl] = await Promise.all([
    storage.put(storagePath, image.data, image.type!),
    storage.put(thumbPath, thumb.data, thumb.type!),
  ])
  const existing = await useDb().where<GalleryImage>('gallery', 'weddingId', wedding.id)
  const now = nowIso()
  const item: GalleryImage = {
    id, weddingId: wedding.id, storagePath, thumbPath, url, thumbUrl,
    width: num('width'), height: num('height'),
    caption: { km: '', en: '' }, alt: { km: '', en: '' },
    order: existing.length, visible: field('visible')?.data.toString() !== 'false', createdAt: now, updatedAt: now,
  }
  await useDb().set('gallery', id, item)
  return item
})
