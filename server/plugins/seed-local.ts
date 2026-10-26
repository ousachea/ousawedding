import { sampleWedding } from '../utils/sample'

// With the local driver, start with sample content so the site works straight away.
export default defineNitroPlugin(async () => {
  if (useRuntimeConfig().driver !== 'local') return
  const db = useDb()
  if ((await db.where('weddings', 'isSample', true)).length || (await findWeddingBySlug(useRuntimeConfig().public.defaultWeddingSlug))) return
  const { wedding, events, gallery, guests } = sampleWedding(useRuntimeConfig().public.defaultWeddingSlug)
  await db.set('weddings', wedding.id, wedding)
  await db.setMany('events', events.map(e => ({ id: e.id, data: e })))
  await db.setMany('gallery', gallery.map(g => ({ id: g.id, data: g })))
  await db.setMany('guests', guests.map(g => ({ id: g.id, data: g })))
})
