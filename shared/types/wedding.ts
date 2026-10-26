export type Locale = 'km' | 'en'
export type Localized = Record<Locale, string>

export type InvitationStatus = 'draft' | 'sent' | 'viewed' | 'responded' | 'revoked'
export type GuestSide = 'bride' | 'groom' | 'both'
export type AdminRole = 'owner' | 'editor'
export type Motif = 'lotus' | 'kbach' | 'none'

export interface ThemeConfig {
  background: string
  accent: string
  secondary: string
  tertiary: string
  text: string
  headingFont: 'serif' | 'sans'
  motif: Motif
}

export interface Wedding {
  id: string
  slug: string
  isSample?: boolean
  names: Record<Locale, { partner1: string, partner2: string }>
  monogram: string
  // Local date-time in `timezone`, e.g. "2027-02-14T16:00"
  date: string
  timezone: string
  content: Record<Locale, { message: string, dressCode: string, instructions: string, story: string }>
  coverImage: string
  theme: ThemeConfig
  defaultLocale: Locale
  rsvp: {
    // Local date-time in `timezone`; RSVPs are accepted until this moment
    deadline: string
    allowUpdates: boolean
    allowGeneral: boolean
    generalMaxAttendees: number
    askDietary: boolean
  }
  privacy: { allowIndexing: boolean }
  published: boolean
  musicUrl: string
  contact: { name: string, phone: string, email: string }
  share: Record<Locale, { title: string, description: string }>
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

export interface Invitation {
  id: string
  weddingId: string
  guestId: string
  tokenHash: string
  // Token encrypted with the server secret so admins can copy the link again later
  tokenEnc: string
  locale: Locale
  status: InvitationStatus
  expiresAt: string
  viewedAt: string
  revokedAt: string
  createdAt: string
  updatedAt: string
}

export interface Rsvp {
  // Equals the guest ID for invited guests, so each guest has at most one RSVP
  id: string
  weddingId: string
  guestId: string
  invitationId: string
  source: 'invitation' | 'general' | 'admin'
  name: string
  attending: boolean
  count: number
  attendeeNames: string[]
  dietary: string
  message: string
  submittedAt: string
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

export interface WeddingStats {
  guests: number
  households: number
  invitations: number
  invitedPeople: number
  attendingPeople: number
  attendingResponses: number
  declined: number
  pending: number
  viewed: number
  responseRate: number
}

/** What the public invitation page receives: no guest data. */
export interface PublicWedding {
  wedding: Omit<Wedding, 'createdAt' | 'updatedAt' | 'published' | 'contact'> & {
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
  preview: boolean
}

export interface ResolvedInvitation {
  guestName: string
  maxAttendees: number
  locale: Locale
  rsvp: Pick<Rsvp, 'attending' | 'count' | 'attendeeNames' | 'dietary' | 'message' | 'updatedAt'> | null
  canEdit: boolean
}
