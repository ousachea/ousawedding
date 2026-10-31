// Puts the guest's name into link previews of personal links (see shared/guest-preview.ts)
import { withGuestName } from '../../shared/guest-preview.ts'
import { parseSpouse } from '../../shared/utils/wedding.ts'

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const params = new URL(req.url).searchParams
  const name = params.get('to')
  if (!name) return
  return withGuestName(await context.next(), name, parseSpouse(params.get('with')))
}

export const config = { path: '/*', excludedPath: ['/_nuxt/*', '/uploads/*', '/sample/*'] }
