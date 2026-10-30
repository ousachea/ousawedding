// Vercel: puts the guest's name into link previews of personal links (see shared/guest-preview.ts).
// It fetches the static page itself; the header stops that fetch from coming back through here.
import { withGuestName } from './shared/guest-preview.ts'

export const config = { matcher: '/((?!_nuxt/|uploads/|sample/).*)' }

export default async function middleware(req: Request) {
  const url = new URL(req.url)
  const name = url.searchParams.get('to')
  if (!name || req.headers.get('x-guest-preview')) return
  return withGuestName(await fetch(url, { headers: { 'x-guest-preview': '1' } }), name)
}
