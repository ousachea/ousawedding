// Netlify function for the live site: the admin (on your computer) reads and deletes a couple's replies here.
// GET /api/replies?slug=<couple> lists them; DELETE /api/replies?slug=<couple>&name=<guest> removes one.
// Guarded by REPLIES_KEY, a secret set both in Netlify and in your .env: replies hold guests' phone numbers.
import { timingSafeEqual } from 'node:crypto'
import { blobReplies, deleteReply } from '../lib/replies.ts'

function allowed(req: Request) {
  const key = process.env.REPLIES_KEY
  const given = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!key || given.length !== key.length) return false
  return timingSafeEqual(Buffer.from(given), Buffer.from(key))
}

export default async (req: Request) => {
  if (!process.env.REPLIES_KEY) return new Response(null, { status: 503 })
  if (!allowed(req)) return new Response(null, { status: 401 })
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? ''
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return new Response(null, { status: 400 })
  if (req.method === 'GET') return Response.json(await blobReplies().list(slug), { headers: { 'cache-control': 'no-store' } })
  if (req.method === 'DELETE') {
    const name = url.searchParams.get('name') ?? ''
    if (!name) return new Response(null, { status: 400 })
    await deleteReply(slug, name)
    return new Response(null, { status: 204 })
  }
  return new Response(null, { status: 405 })
}

export const config = { path: '/api/replies' }
