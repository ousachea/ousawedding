export type Locale = 'km' | 'en'
export type Localized = Record<Locale, string>

export type GuestSide = 'bride' | 'groom' | 'both'
export type AdminRole = 'owner' | 'editor'
export type Motif = 'lotus' | 'kbach' | 'none'
export type WeddingStyle = 'classic' | 'floral'
export type TextBlock = 'story' | 'thanks' | 'apology'
export type EventIcon = 'calendar' | 'rings' | 'lotus' | 'incense' | 'knot' | 'scissors' | 'gift' | 'food' | 'guests' | 'music' | 'heart' | 'camera' | 'dress' | 'clock'

export interface ThemeConfig {
  background: string
  accent: string
  secondary: string
  tertiary: string
  text: string
  headingFont: 'serif' | 'sans'
  motif: Motif
  // Page design; missing on weddings saved before styles existed (= classic)
  style?: WeddingStyle
  // Display fonts for each language (one of FONTS_EN / FONTS_KM); missing or '' = the default
  fontEn?: string
  fontKm?: string
}

export interface Wedding {
  id: string
  slug: string
  isSample?: boolean
  // parents1/parents2: each partner's parents, one per line, e.g. "Mr ... & Mrs ..."
  names: Record<Locale, { partner1: string, partner2: string, parents1: string, parents2: string }>
  monogram: string
  // Local date-time in `timezone`, e.g. "2027-02-14T16:00"
  date: string
  timezone: string
  content: Record<Locale, { message: string, dressCode: string, instructions: string, story: string, thanks: string, apology: string }>
  coverImage: string
  // Each partner's portrait; missing on weddings saved before it existed
  partnerPhotos?: { partner1: string, partner2: string }
  // Point of the cover photo kept in view when it is cropped, as CSS object-position ("50% 20%"); missing = centre
  coverPosition?: string
  theme: ThemeConfig
  defaultLocale: Locale
  rsvp: {
    // Local date-time in `timezone`; the RSVP button shows until this moment
    deadline: string
    // Where guests reply, e.g. a Google Form; empty hides the button
    formUrl: string
  }
  privacy: { allowIndexing: boolean }
  // Page order of the text blocks; missing on weddings saved before it existed
  textOrder?: TextBlock[]
  musicUrl: string
  contact: { name: string, phone: string, email: string }
  share: Record<Locale, { title: string, description: string }>
  // Link-preview image: `cover` cropped to 1200×630 around `position` (object-position). Used only while the
  // cover photo is still `cover`; otherwise previews show the whole cover. Set by the share-image upload.
  shareImage?: { url: string, cover: string, position: string }
  createdAt: string
  updatedAt: string
}

export interface WeddingEvent {
  id: string
  weddingId: string
  title: Localized
  description: Localized
  venue: Localized
  address: Localized
  // Local date-times in the wedding's timezone
  start: string
  end: string
  mapUrl: string
  imageUrl: string
  // Missing on events saved before icons existed
  icon?: EventIcon
  order: number
  createdAt: string
  updatedAt: string
}

export interface Guest {
  id: string
  weddingId: string
  name: string
  side: GuestSide
  group: string
  householdId: string
  maxAttendees: number
  phone: string
  email: string
  notes: string
  archived: boolean
  createdAt: string
  updatedAt: string
}

export interface GalleryImage {
  id: string
  weddingId: string
  storagePath: string
  thumbPath: string
  url: string
  thumbUrl: string
  width: number
  height: number
  caption: Localized
  alt: Localized
  order: number
  visible: boolean
  createdAt: string
  updatedAt: string
}

export interface Admin {
  id: string
  email: string
  name: string
  role: AdminRole
  // '*' grants access to every wedding
  weddingIds: string[]
}

/** What the public invitation page receives: no guest data. */
export interface PublicWedding {
  wedding: Omit<Wedding, 'createdAt' | 'updatedAt' | 'contact'> & {
    contact: Wedding['contact']
  }
  dateUtc: string
  deadlineUtc: string
  deadlinePassed: boolean
  display: Record<Locale, { date: string, time: string, deadline: string }>
  events: Array<WeddingEvent & {
    startUtc: string
    endUtc: string
    display: Record<Locale, { date: string, time: string }>
  }>
  gallery: Array<Pick<GalleryImage, 'id' | 'url' | 'thumbUrl' | 'width' | 'height' | 'caption' | 'alt'>>
}
