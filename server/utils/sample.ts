// SAMPLE DATA for development and first setup. Every name, date and place here is made up;
// replace it from the admin dashboard before sending invitations.
// Self-contained (no Nuxt auto-imports) so scripts/bootstrap.ts can import it directly.
import { randomBytes } from 'node:crypto'
import type { GalleryImage, Guest, Wedding, WeddingEvent } from '../../shared/types/wedding.ts'

const id = () => randomBytes(12).toString('base64url')

export function sampleWedding(slug = 'our-wedding') {
  const now = new Date().toISOString()
  const weddingId = id()

  const wedding: Wedding = {
    id: weddingId,
    slug,
    isSample: true,
    names: {
      km: { partner1: 'សុខា', partner2: 'ដារា' },
      en: { partner1: 'Sokha', partner2: 'Dara' },
    },
    monogram: 'S & D',
    date: '2027-02-14T07:00',
    timezone: 'Asia/Phnom_Penh',
    content: {
      km: {
        message: 'ដោយក្តីគោរព និងរីករាយ យើងខ្ញុំសូមគោរពអញ្ជើញ លោក លោកស្រី អ្នកនាងកញ្ញា អញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិត្តិយស ក្នុងពិធីអាពាហ៍ពិពាហ៍របស់យើងខ្ញុំ។ វត្តមានរបស់លោកអ្នក គឺជាកិត្តិយសដ៏ខ្ពង់ខ្ពស់សម្រាប់គ្រួសារយើងខ្ញុំ។',
        dressCode: 'សម្លៀកបំពាក់ប្រពៃណីខ្មែរ ឬសម្លៀកបំពាក់ផ្លូវការ',
        instructions: 'សូមអញ្ជើញមកដល់មុនម៉ោង ១៥ នាទី។ មានចំណតរថយន្តនៅមុខទីតាំង។',
        story: 'យើងបានជួបគ្នាដំបូងនៅភ្នំពេញ ហើយចាប់ពីពេលនោះមក ក្តីស្រលាញ់របស់យើងបានរីកលូតលាស់ដូចផ្កាឈូក។',
      },
      en: {
        message: 'With great joy and respect, we request the honour of your presence at our wedding celebration. Your presence would be a great honour for our families.',
        dressCode: 'Traditional Khmer attire or formal wear',
        instructions: 'Please arrive 15 minutes early. Parking is available in front of the venue.',
        story: 'We first met in Phnom Penh, and our love has grown ever since, like a lotus rising from the water.',
      },
    },
    coverImage: '/sample/cover.svg',
    theme: {
      background: '#F7F1E7', accent: '#C8A45D', secondary: '#9E242E', tertiary: '#34483B', text: '#332B29',
      headingFont: 'serif', motif: 'lotus',
    },
    defaultLocale: 'km',
    rsvp: { deadline: '2027-01-31T23:59', allowUpdates: true, allowGeneral: false, generalMaxAttendees: 2, askDietary: true },
    privacy: { allowIndexing: false },
    published: true,
    musicUrl: '',
    contact: { name: 'Sample contact', phone: '+855 12 345 678', email: '' },
    share: {
      km: { title: 'សុខា & ដារា | ពិធីអាពាហ៍ពិពាហ៍', description: 'សូមគោរពអញ្ជើញចូលរួមពិធីអាពាហ៍ពិពាហ៍របស់យើង។' },
      en: { title: 'Sokha & Dara | Wedding Invitation', description: 'You are invited to celebrate our wedding.' },
    },
    createdAt: now,
    updatedAt: now,
  }

  const event = (order: number, e: Omit<WeddingEvent, 'id' | 'weddingId' | 'order' | 'createdAt' | 'updatedAt' | 'imageUrl'>): WeddingEvent =>
    ({ id: id(), weddingId, order, imageUrl: '', createdAt: now, updatedAt: now, ...e })

  const events: WeddingEvent[] = [
    event(0, {
      title: { km: 'ពិធីហែជំនូន', en: 'Procession of Gifts' },
      description: { km: 'ពិធីប្រពៃណីហែជំនូនរបស់ខាងកូនប្រុស', en: 'The traditional procession of gifts from the groom\'s family.' },
      venue: { km: 'គេហដ្ឋានខាងកូនស្រី (គំរូ)', en: 'Bride\'s family home (sample)' },
      address: { km: 'ផ្លូវលេខ ០០០ សង្កាត់គំរូ ភ្នំពេញ', en: 'Street 000, Sample Sangkat, Phnom Penh' },
      start: '2027-02-14T07:00', end: '2027-02-14T09:00',
      mapUrl: 'https://maps.google.com/?q=Phnom+Penh',
    }),
    event(1, {
      title: { km: 'ពិធីកាត់សក់ និងចងដៃ', en: 'Hair-Cutting & Knot-Tying Ceremony' },
      description: { km: 'ពិធីប្រពៃណីខ្មែរ ដើម្បីប្រសិទ្ធពរជ័យដល់គូស្វាមីភរិយា', en: 'Traditional Khmer blessings for the couple.' },
      venue: { km: 'គេហដ្ឋានខាងកូនស្រី (គំរូ)', en: 'Bride\'s family home (sample)' },
      address: { km: 'ផ្លូវលេខ ០០០ សង្កាត់គំរូ ភ្នំពេញ', en: 'Street 000, Sample Sangkat, Phnom Penh' },
      start: '2027-02-14T09:30', end: '2027-02-14T11:30',
      mapUrl: 'https://maps.google.com/?q=Phnom+Penh',
    }),
    event(2, {
      title: { km: 'ពិធីជប់លៀងអាពាហ៍ពិពាហ៍', en: 'Wedding Reception' },
      description: { km: 'ពិធីជប់លៀង និងអាហារពេលល្ងាច', en: 'Dinner and celebration.' },
      venue: { km: 'សណ្ឋាគារគំរូ', en: 'Sample Hotel Ballroom' },
      address: { km: 'មហាវិថីគំរូ ភ្នំពេញ', en: 'Sample Boulevard, Phnom Penh' },
      start: '2027-02-14T17:00', end: '2027-02-14T21:00',
      mapUrl: 'https://maps.google.com/?q=Phnom+Penh',
    }),
  ]

  const gallery: GalleryImage[] = [1, 2, 3, 4].map((n, i) => ({
    id: id(),
    weddingId,
    storagePath: '',
    thumbPath: '',
    url: `/sample/photo-${n}.svg`,
    thumbUrl: `/sample/photo-${n}.svg`,
    width: n % 2 ? 800 : 600,
    height: n % 2 ? 1000 : 800,
    caption: { km: `រូបភាពគំរូ ${n}`, en: `Sample photo ${n}` },
    alt: { km: `រូបភាពគំរូទី ${n}`, en: `Sample placeholder photo ${n}` },
    order: i,
    visible: true,
    createdAt: now,
    updatedAt: now,
  }))

  const guest = (name: string, side: Guest['side'], group: string, maxAttendees: number): Guest =>
    ({ id: id(), weddingId, name, side, group, householdId: '', maxAttendees, phone: '', email: '', notes: 'Sample guest', archived: false, createdAt: now, updatedAt: now })

  const guests: Guest[] = [
    guest('Sample Family Chan', 'bride', 'Family', 4),
    guest('Sample Guest Vann', 'groom', 'Friends', 2),
    guest('Sample Guest Lim', 'both', 'Colleagues', 1),
  ]

  return { wedding, events, gallery, guests }
}
