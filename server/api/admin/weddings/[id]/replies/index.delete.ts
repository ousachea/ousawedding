import { replyKey } from '~~/shared/rsvp'

// Removes one guest's reply (e.g. a test reply), here and on the live site: { name }
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const body = await readBody<{ name?: unknown }>(event).catch(() => null)
  const name = typeof body?.name === 'string' ? body.name : ''
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Name missing' })
  await useDb().delete('replies', replyKey(wedding.slug, name))
  await liveReplies()?.remove(wedding.slug, name)
  return { ok: true }
})
