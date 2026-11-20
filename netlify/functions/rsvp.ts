// Netlify function for the live (static) site: POST /api/rsvp (see shared/rsvp.ts)
import { alertWeddingBySlug, sendRsvp } from '../../shared/rsvp.ts'
import { blobReplies } from '../lib/replies.ts'
// Bundled with the function at deploy time, so each couple's chat is known without a database
import weddings from '../../content/weddings.json'

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  const body = await req.json().catch(() => null)
  return new Response(null, { status: await sendRsvp(body, { host: new URL(req.url).host, wedding: alertWeddingBySlug(weddings, body?.slug), store: blobReplies() }) })
}

export const config = { path: '/api/rsvp' }
