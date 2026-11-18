// Netlify function for the live (static) site: POST /api/opened (see shared/rsvp.ts)
import { sendOpened } from '../../shared/rsvp.ts'

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  const body = await req.json().catch(() => null)
  return new Response(null, { status: await sendOpened(body) })
}

export const config = { path: '/api/opened' }
