// The same contact endpoint on the dev server; the live site uses netlify/functions/contact.ts
import { sendContact } from '~~/shared/rsvp'

export default defineEventHandler(async (event) => {
  rateLimit(event, 'contact', 5, 15 * 60_000)
  const body = await readBody(event).catch(() => null)
  setResponseStatus(event, await sendContact(body))
  return null
})
