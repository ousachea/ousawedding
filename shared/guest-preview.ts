// Link previews (Messenger, Telegram, …) read the page without running it, so for a personal link (?to=Name)
// the guest's name is written into the title tags as the page is served. Used by the Netlify edge function.
import type { Spouse } from './types/wedding.ts'
import { withSpouse } from './utils/wedding.ts'

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function addGuestToTitles(html: string, rawName: string, spouse: Spouse = ''): string {
  const name = rawName.trim().slice(0, 120)
  if (!name) return html
  // Same words as the envelope (envelope.for)
  const km = /<html[^>]*\blang="km"/.test(html)
  const guest = withSpouse(name, spouse, km ? 'km' : 'en')
  const prefix = escapeHtml(km ? `សូមគោរពជូន ${guest}` : `Specially for ${guest}`)
  return html
    .replace('<title>', `<title>${prefix} | `)
    .replace(/(<meta (?:property="og:title"|name="twitter:title") content=")/g, `$1${prefix} | `)
}

/** The response with the guest's name added, or as it was when it is not an HTML page. */
export async function withGuestName(res: Response, name: string, spouse: Spouse = ''): Promise<Response> {
  if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return res
  const headers = new Headers(res.headers)
  headers.delete('content-length')
  return new Response(addGuestToTitles(await res.text(), name, spouse), { status: res.status, headers })
}
