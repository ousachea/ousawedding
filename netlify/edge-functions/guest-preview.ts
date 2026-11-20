// Puts the guest's name into link previews of personal links (see shared/guest-preview.ts)
import { fixPartialRedirect, personalLink, withGuestName } from '../../shared/guest-preview.ts'
import { guestNameFromLink, parseSpouse } from '../../shared/utils/wedding.ts'

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(req.url)
  const params = url.searchParams
  const name = params.get('to')
  // Only requests for part of a page (link-preview robots) need the redirect fix; others pass straight on
  if (!name) return req.headers.has('range') ? fixPartialRedirect(await context.next(), url) : undefined
  return withGuestName(await context.next(), guestNameFromLink(name, url.pathname.startsWith('/km/') ? 'km' : 'en'), parseSpouse(params.get('with')), personalLink(url))
}

export const config = { path: '/*', excludedPath: ['/_nuxt/*', '/uploads/*', '/sample/*'] }
