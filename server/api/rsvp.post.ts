// The same RSVP endpoint on the dev server; the live site uses netlify/functions/rsvp.ts
import { sendRsvp } from '~~/shared/rsvp'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'rsvp', 10, 15 * 60_000)
  const body = await readBody(event).catch(() => null)
  setResponseStatus(event, await sendRsvp(body, { host: getRequestHost(event), wedding: typeof body?.slug === 'string' ? await findWeddingBySlug(body.slug) : null, store: localReplies() }))
  return null
})
