import { sampleWedding } from '../utils/sample'

// Start with sample content when there is none yet, so the site works straight away.
export default defineNitroPlugin(async () => {
  const db = useDb()
  if ((await db.all('weddings')).length) return
  const { wedding, events, gallery, guests } = sampleWedding(useRuntimeConfig().public.defaultWeddingSlug)
  await db.set('weddings', wedding.id, wedding)
  await db.setMany('events', events.map(e => ({ id: e.id, data: e })))
  await db.setMany('gallery', gallery.map(g => ({ id: g.id, data: g })))
  // Never mix sample guests into a real guest list
  if (!(await db.all('guests')).length) await db.setMany('guests', guests.map(g => ({ id: g.id, data: g })))
})
