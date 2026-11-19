// The same "invitation opened" endpoint on the dev server; the live site uses netlify/functions/opened.ts
import { sendOpened } from '~~/shared/rsvp'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'opened', 30, 15 * 60_000)
  const body = await readBody(event).catch(() => null)
  setResponseStatus(event, await sendOpened(body, { host: getRequestHost(event) }))
  return null
})
