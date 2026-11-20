// Netlify function for the live (static) site: POST /api/contact, the home page's contact form (see shared/rsvp.ts)
import { sendContact } from '../../shared/rsvp.ts'

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 })
  const body = await req.json().catch(() => null)
  return new Response(null, { status: await sendContact(body) })
}

export const config = { path: '/api/contact' }
