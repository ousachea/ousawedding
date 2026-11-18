import type { Spouse } from '../types/wedding.ts'

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

/** A guest's personal invitation link: the live site address plus their name (and spouse), which the envelope shows. */
export function inviteLink(wedding: { slug: string }, guestName: string, siteUrl = '', locale: 'km' | 'en' = 'en', spouse: Spouse = '') {
  const prefix = locale === 'km' ? '/km' : ''
  // Trailing slash: the static host serves the page there directly, without a redirect first
  return `${siteUrl.replace(/\/$/, '')}${prefix}/${wedding.slug}/?to=${encodeURIComponent(guestName)}${spouse ? `&with=${spouse}` : ''}`
}

const SPOUSE_WORDS = { en: { wife: 'and wife', husband: 'and husband' }, km: { wife: 'និងភរិយា', husband: 'និងស្វាមី' } }
/** A guest's name as the envelope addresses them: "Sok Dara and wife", "សុខ ដារ៉ា និងភរិយា". */
export const withSpouse = (name: string, spouse: Spouse | undefined, locale: 'km' | 'en') =>
  spouse ? `${name} ${SPOUSE_WORDS[locale][spouse]}` : name
// Titles a link can start with ("MrCheaOusa"), written out per language. Couples' titles come first,
// so "HE" doesn't claim the start of "HE and Lok Chumteav".
const TITLES = [
  [/^h ?e (?:and |& )?lok chumteav /i, { en: 'H.E. & Lok Chumteav', km: 'ឯកឧត្តម និងលោកជំទាវ' }],
  [/^oknha (?:and |& )?lok chumteav /i, { en: 'Oknha & Lok Chumteav', km: 'អ្នកឧកញ៉ា និងលោកជំទាវ' }],
  [/^samdech /i, { en: 'Samdech', km: 'សម្តេច' }],
  [/^h ?e /i, { en: 'H.E.', km: 'ឯកឧត្តម' }],
  [/^lok chumteav /i, { en: 'Lok Chumteav', km: 'លោកជំទាវ' }],
  [/^oknha /i, { en: 'Oknha', km: 'អ្នកឧកញ៉ា' }],
  [/^lok kru /i, { en: 'Lok Kru', km: 'លោកគ្រូ' }],
  [/^neak kru /i, { en: 'Neak Kru', km: 'អ្នកគ្រូ' }],
  [/^mr (?:and |& )?mrs /i, { en: 'Mr. & Mrs.', km: 'លោក និងលោកស្រី' }],
  [/^mrs /i, { en: 'Mrs.', km: 'លោកស្រី' }],
  [/^mr /i, { en: 'Mr.', km: 'លោក' }],
  [/^ms /i, { en: 'Ms.', km: 'អ្នកនាង' }],
  [/^miss /i, { en: 'Miss', km: 'កញ្ញា' }],
  [/^dr /i, { en: 'Dr.', km: 'បណ្ឌិត' }],
] as const

/**
 * The guest's name as typed into a link, made readable: links are often typed without spaces, so
 * "CheaOusa", "Chea-Ousa" and "chea_ousa" all become "Chea Ousa". A leading title is recognised and
 * written in the page's language: "MrCheaOusa" is "Mr. Chea Ousa" in English, "លោក Chea Ousa" in Khmer;
 * "MrAndMrsCheaOusa" is "Mr. & Mrs. Chea Ousa", "HECheaOusa" is "H.E. Chea Ousa" / "ឯកឧត្តម Chea Ousa".
 * Khmer names are left as they are.
 * `withTitle: false` gives the name alone (for the RSVP form).
 */
export function guestNameFromLink(raw: string, locale: 'km' | 'en' = 'en', withTitle = true) {
  let name = raw.replace(/&/g, ' & ').replace(/[-_+.]+/g, ' ').replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    // "HEChea": the capitals of "HE" run straight into the name
    .replace(/^HE(?=\p{Lu}\p{Ll})/u, 'HE ')
    .replace(/\s+/g, ' ').trim().slice(0, 120)
  // Typed all in lower case ("chea ousa"): capitalise each word
  if (!/\p{Lu}/u.test(name)) name = name.replace(/(^|\s)(\p{Ll})/gu, (_, s, c) => s + c.toUpperCase())
  const title = TITLES.find(([re]) => re.test(`${name} `))
  if (!title) return name
  const rest = `${name} `.replace(title[0], '').trim()
  // A title alone, with no name after it, is kept as typed
  if (!rest) return name
  return withTitle ? `${title[1][locale]} ${rest}` : rest
}
/** The spouse from a link's `with=` value; anything else means none. */
export const parseSpouse = (v: unknown): Spouse => (v === 'wife' || v === 'husband' ? v : '')

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
