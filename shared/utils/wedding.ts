/** The invitation's free-text blocks, in their default page order. */
export const TEXT_BLOCKS = ['story', 'thanks', 'apology'] as const

/** Icons a schedule item can use (all drawn in WeddingIcon). */
export const EVENT_ICONS = ['calendar', 'rings', 'lotus', 'incense', 'knot', 'scissors', 'gift', 'food', 'guests', 'music', 'heart', 'camera', 'dress', 'clock'] as const satisfies readonly EventIcon[]

/** Display fonts the couple can pick from Google Fonts; '' keeps the default (Cormorant Garamond / Noto Serif Khmer). */
export const FONTS_EN = ['Playfair Display', 'Cinzel', 'Lora', 'EB Garamond', 'Great Vibes', 'Dancing Script', 'Parisienne', 'Montserrat'] as const
export const FONTS_KM = ['Moul', 'Battambang', 'Bayon', 'Koulen', 'Dangrek', 'Hanuman', 'Kantumruy Pro', 'Angkor', 'Fasthand', 'Siemreap', 'Noto Sans Khmer'] as const

/** Google Fonts stylesheet for the given families. shortcut: regular weight only (some fonts have no others); bold is synthesised. */
export const fontsHref = (families: readonly string[]) =>
  `https://fonts.googleapis.com/css2?${families.map(f => `family=${f.replace(/ /g, '+')}`).join('&')}&display=swap`

/** A guest's personal invitation link: the live site address plus their name, which the envelope shows. */
export function inviteLink(wedding: { slug: string }, guestName: string, siteUrl = '', locale: 'km' | 'en' = 'en') {
  const prefix = locale === 'en' ? '/en' : ''
  // Trailing slash: the static host serves the page there directly, without a redirect first
  return `${siteUrl.replace(/\/$/, '')}${prefix}/${wedding.slug}/?to=${encodeURIComponent(guestName)}`
}

/**
 * What a shared link shows: the page title (browser tab, Google), the title chat apps show, and the description.
 * The couple's own text comes first; the date and time are always added. Used by the invitation and the admin preview.
 */
export function shareMeta(
  wedding: { names: Record<'km' | 'en', { partner1: string, partner2: string }>, share: Record<'km' | 'en', { title: string, description: string }> },
  when: { date: string, time: string },
  locale: 'km' | 'en',
  invite: string,
) {
  const share = wedding.share[locale]
  const names = `${wedding.names[locale].partner1} & ${wedding.names[locale].partner2}`
  return {
    names,
    title: share.title || `${names} | ${invite}`,
    cardTitle: share.title || names,
    description: [share.description || invite, `${when.date} · ${when.time}`].join(' · '),
  }
}
