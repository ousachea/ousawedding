// Puts the guest's name into link previews of personal links (see shared/guest-preview.ts)
import { withGuestName } from '../../shared/guest-preview.ts'
import { guestNameFromLink, parseSpouse } from '../../shared/utils/wedding.ts'

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const url = new URL(req.url)
  const params = url.searchParams
  const name = params.get('to')
  if (!name) return
  return withGuestName(await context.next(), guestNameFromLink(name, url.pathname.startsWith('/km/') ? 'km' : 'en'), parseSpouse(params.get('with')))
}

export const config = { path: '/*', excludedPath: ['/_nuxt/*', '/uploads/*', '/sample/*'] }
