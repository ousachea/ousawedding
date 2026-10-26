/** The invitation's free-text blocks, in their default page order. */
export const TEXT_BLOCKS = ['story', 'thanks', 'apology'] as const

/** Icons a schedule item can use (all drawn in WeddingIcon). */
export const EVENT_ICONS = ['calendar', 'rings', 'lotus', 'incense', 'knot', 'scissors', 'gift', 'food', 'guests', 'music', 'heart', 'camera', 'dress', 'clock'] as const satisfies readonly EventIcon[]

/** A guest's personal invitation link: the live site address plus their name, which the envelope shows. */
export function inviteLink(wedding: { slug: string }, guestName: string, siteUrl = '', locale: 'km' | 'en' = 'km') {
  const prefix = locale === 'en' ? '/en' : ''
  return `${siteUrl.replace(/\/$/, '')}${prefix}/${wedding.slug}?to=${encodeURIComponent(guestName)}`
}
