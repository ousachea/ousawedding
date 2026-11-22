// Reads a Google Maps link pasted in the admin: follows short links (maps.app.goo.gl) to the full one, takes the
// place name and pin from it, then looks up the address in Khmer and English (OpenStreetMap, no key needed).
// Only Google Maps addresses are fetched, so the server can't be pointed at anything else.
const GOOGLE = /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?|consent\.google\.com)$/

async function resolve(link: string) {
  let url = new URL(link)
  for (let hop = 0; hop < 5; hop++) {
    if (url.protocol !== 'https:' || !GOOGLE.test(url.hostname)) throw createError({ statusCode: 400, statusMessage: 'Not a Google Maps link' })
    // Outside the EU there is no consent page, but if there is, the real address is in `continue`
    if (url.hostname === 'consent.google.com' && url.searchParams.get('continue')) {
      url = new URL(url.searchParams.get('continue')!)
      continue
    }
    if (!/goo\.gl$/.test(url.hostname)) return url
    const res = await fetch(url, { redirect: 'manual' })
    const next = res.headers.get('location')
    if (!next) throw createError({ statusCode: 400, statusMessage: 'This short link leads nowhere' })
    url = new URL(next, url)
  }
  throw createError({ statusCode: 400, statusMessage: 'Too many redirects' })
}

type Place = { name?: string, display_name?: string }
const reverse = (lat: string, lng: string, lang: 'km' | 'en') => $fetch<Place>('https://nominatim.openstreetmap.org/reverse', {
  query: { format: 'jsonv2', lat, lon: lng, 'accept-language': lang, zoom: 18 },
  headers: { 'User-Agent': 'ousawedding-admin/1.0' },
  timeout: 8000,
}).catch(() => null)

// "Name, road, sangkat, khan, city, 120102, Cambodia" → "road, sangkat, khan, city"
function addressOf(p: Place | null) {
  const parts = (p?.display_name ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (p?.name && parts[0] === p.name) parts.shift()
  return parts.filter((s, i) => !/^\d+$/.test(s) && i !== parts.length - 1).join(', ')
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { url: link } = await readBody<{ url?: string }>(event)
  if (typeof link !== 'string' || !/^https:\/\//.test(link.trim())) throw createError({ statusCode: 400, statusMessage: 'Paste a Google Maps link' })
  const url = await resolve(link.trim())
  const full = url.toString()
  // The place's own pin before the view's centre, as in venueMap
  const at = full.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) ?? full.match(/[@=](-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/)
  const named = url.pathname.match(/\/place\/([^/]+)/)?.[1] ?? url.searchParams.get('q') ?? ''
  const name = decodeURIComponent(named.replace(/\+/g, ' ')).trim()
  if (!at && !name) throw createError({ statusCode: 400, statusMessage: 'No place found in this link' })

  const [en, km] = at ? await Promise.all([reverse(at[1]!, at[2]!, 'en'), reverse(at[1]!, at[2]!, 'km')]) : [null, null]
  // Coordinates alone are no name: "11.55, 104.92" is left for the couple to fill in
  const googleName = /^-?\d+\.\d+,/.test(name) ? '' : name
  // OpenStreetMap gives the nearest thing to the pin, which may be the school next door: its Khmer name is
  // used only when its English name is the place's own. A dropped pin, with no name, leaves the venue empty.
  const same = en?.name?.toLowerCase() === googleName.toLowerCase()
  const kmName = googleName && same && km?.name && /\p{Script=Khmer}/u.test(km.name) ? km.name : ''
  return {
    // The full link, so the map pins the spot; a long one would be cut by the 2000-character limit
    mapUrl: full.length <= 2000 ? full : link.trim(),
    venue: { en: googleName, km: kmName || googleName },
    address: { en: addressOf(en), km: addressOf(km) },
  }
})
