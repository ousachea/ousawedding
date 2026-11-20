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

/**
 * og:url set to the personal link itself. Facebook and Messenger read the preview from og:url, so with the
 * plain invitation's address there every guest's link would show the plain preview, without their name.
 */
export function setShareUrl(html: string, url: string): string {
  return html.replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escapeHtml(url)}$2`)
}

/** The personal link as shared: the page with its closing slash, and only the guest's own parameters */
export function personalLink(requestUrl: URL): string {
  const path = requestUrl.pathname.endsWith('/') ? requestUrl.pathname : `${requestUrl.pathname}/`
  const query = new URLSearchParams()
  for (const key of ['to', 'with']) {
    const v = requestUrl.searchParams.get(key)
    if (v) query.set(key, v)
  }
  return `${requestUrl.origin}${path}?${query}`
}

/** The response with the guest's name (and their own link) added, or as it was when it is not an HTML page. */
export async function withGuestName(res: Response, name: string, spouse: Spouse = '', link?: string): Promise<Response> {
  if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return res
  const headers = new Headers(res.headers)
  headers.delete('content-length')
  let html = addGuestToTitles(await res.text(), name, spouse)
  if (link) html = setShareUrl(html, link)
  return new Response(html, { status: res.status, headers })
}

/**
 * Netlify answers a short personal link (/ousa-kanha/MrDara, sent on to /ousa-kanha/?to=MrDara by
 * public/_redirects) asked for in part, as Facebook asks for pages, with "206 Partial Content" instead of
 * a redirect. Facebook doesn't follow that and finds no preview, so it is turned back into a redirect.
 */
export function fixPartialRedirect(res: Response, requestUrl: URL): Response {
  const location = res.headers.get('location')
  return res.status === 206 && location ? Response.redirect(new URL(location, requestUrl).href, 301) : res
}
