// Puts the guest's name into link previews of personal links (see shared/guest-preview.ts)
import { withGuestName } from '../../shared/guest-preview.ts'

export default async (req: Request, context: { next: () => Promise<Response> }) => {
  const name = new URL(req.url).searchParams.get('to')
  if (!name) return
  return withGuestName(await context.next(), name)
}

export const config = { path: '/*', excludedPath: ['/_nuxt/*', '/uploads/*', '/sample/*'] }
