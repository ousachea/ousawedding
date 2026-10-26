// SAMPLE DATA for development and first setup. Every name, date and place here is made up;
// replace it from the admin dashboard before sending invitations.
// Self-contained (no Nuxt auto-imports) so scripts/bootstrap.ts can import it directly.
import { randomBytes } from 'node:crypto'
import type { EventIcon, GalleryImage, Guest, Wedding, WeddingEvent } from '../../shared/types/wedding.ts'

const id = () => randomBytes(12).toString('base64url')

export function sampleWedding(slug = 'our-wedding') {
  const now = new Date().toISOString()
  const weddingId = id()

  const wedding: Wedding = {
    id: weddingId,
    slug,
    isSample: true,
    names: {
      // Khmer spelling not provided yet, so the English names are used for both
      km: { partner1: 'Ousa Chea', partner2: 'Kanha Neak', parents1: '', parents2: '' },
      en: { partner1: 'Ousa Chea', partner2: 'Kanha Neak', parents1: '', parents2: '' },
    },
    monogram: 'O & K',
    date: '2027-01-31T07:00',
    timezone: 'Asia/Phnom_Penh',
    content: {
      km: {
        message: 'សូមគោរពអញ្ជើញ\nយើងខ្ញុំជាមាតា បិតា មានកិត្តយសសូមគោរពអញ្ញើញ សម្តេច ឯកឧត្តម លោកជំទាវ អ្នកឧកញ៉ា ឧកញ៉ា លោក លោក​ស្រី អ្នកនាង កញ្ញា អញ្ជើញចូលរួមជាអធិបតី និងជាភ្ញៀវកិតិ្តយស ចម្រើនជោគជ័យ សិរីសួស្ដី ក្នុងពិធីរៀបអាពាហ៍ពិពាហ៍ កូនប្រុស-កូនស្រី របស់យើងខ្ញុំ!',
        dressCode: 'សម្លៀកបំពាក់ប្រពៃណីខ្មែរ ឬសម្លៀកបំពាក់ផ្លូវការ',
        instructions: 'សូមអញ្ជើញមកដល់មុនម៉ោង ១៥ នាទី។ មានចំណតរថយន្តនៅមុខទីតាំង។',
        story: 'យើងបានជួបគ្នាដំបូងនៅភ្នំពេញ ហើយចាប់ពីពេលនោះមក ក្តីស្រលាញ់របស់យើងបានរីកលូតលាស់ដូចផ្កាឈូក។',
        thanks: 'ខ្ញុំបាទ នាងខ្ញុំ ជាមាតាបិតា កូនប្រុស កូនស្រី សូមគោរពថ្លែងអំណរគុណយ៉ាងជ្រាលជ្រៅចំពោះវត្តមានដ៏ឧត្តុង្គឧត្តមរបស់ សម្តេច ឯកឧត្តម លោកជំទាវ អ្នកឧកញ៉ា ឧកញ៉ា លោក លោកស្រី អ្នកនាង កញ្ញា ក្នុងពិធីសិរីមង្គលអាពាហ៍ពិពាហ៍ កូនប្រុស កូនស្រីរបស់យើងខ្ញុំ។ សូមមេត្តាទទួលនូវសេចក្តីគោរពដ៏ខ្ពង់ខ្ពស់ពីយើងខ្ញុំ!',
        apology: 'សូមមេត្តាខន្តី អភ័យទោស ពីសំណាក់ សម្តេច ឯកឧត្តម លោកជំទាវ អ្នកឧកញ៉ា ឧកញ៉ា លោក លោកស្រី អ្នកនាង កញ្ញា និងភ្ញៀវកិត្តិយសទាំងអស់ ដោយយើងខ្ញុំពុំបានជូនលិខិតអញ្ជើញដោយផ្ទាល់ដៃ ឬចំពោះកំហុសអក្ខរាវិរុទ្ធ ក្នុងការសរសេរឈ្មោះ។ សូមមេត្តាយោគយល់ និងសូមគោរពអរគុណទុកជាមុន!',
      },
      en: {
        message: 'We, the parents, have the honour to respectfully invite Samdech, Excellencies, Lok Chumteav, Neak Oknha, Oknha, Ladies and Gentlemen to join us as presiding guests and guests of honour, bringing success and blessings to the wedding ceremony of our son and daughter.',
        dressCode: 'Traditional Khmer attire or formal wear',
        instructions: 'Please arrive 15 minutes early. Parking is available in front of the venue.',
        story: 'We first met in Phnom Penh, and our love has grown ever since, like a lotus rising from the water.',
        thanks: 'We, the parents of the groom and the bride, express our deepest gratitude to Samdech, Excellencies, Lok Chumteav, Neak Oknha, Oknha, Ladies and Gentlemen for your honourable presence at the wedding ceremony of our son and daughter. Please accept our highest respect!',
        apology: 'We humbly ask the forgiveness of Samdech, Excellencies, Lok Chumteav, Neak Oknha, Oknha, Ladies and Gentlemen and all our guests of honour for not delivering this invitation by hand, and for any misspelling of names. Thank you in advance for your understanding!',
      },
    },
    coverImage: '/sample/cover.svg',
    theme: {
      background: '#F5F0F6', accent: '#C9A24A', secondary: '#5B2A86', tertiary: '#2D1640', text: '#2A1F33',
      headingFont: 'serif', motif: 'lotus', style: 'classic',
    },
    defaultLocale: 'km',
    rsvp: { deadline: '2027-01-25T23:59', allowUpdates: true, allowGeneral: false, generalMaxAttendees: 2, askDietary: true },
    privacy: { allowIndexing: false },
    textOrder: ['story', 'thanks', 'apology'],
    published: true,
    musicUrl: '',
    contact: { name: 'Sample contact', phone: '+855 12 345 678', email: '' },
    share: {
      km: { title: 'Ousa & Kanha | ពិធីអាពាហ៍ពិពាហ៍', description: 'សូមគោរពអញ្ជើញចូលរួមពិធីអាពាហ៍ពិពាហ៍របស់យើង។' },
      en: { title: 'Ousa & Kanha | Wedding Invitation', description: 'You are invited to celebrate our wedding.' },
    },
    createdAt: now,
    updatedAt: now,
  }

  // [start, end, Khmer title, English title, icon, Khmer description, English description]; venues are added in the admin
  const program: Array<[string, string, string, string, EventIcon, string, string]> = [
    ['2027-01-30T14:00', '2027-01-30T15:00', 'ពិធីសែនក្រុងពាលី', 'Krong Pealy offering ceremony', 'incense', 'ពិធីបួងសួងដល់ក្រុងពាលី ជាម្ចាស់ទឹកដី សុំសេចក្តីសុខ និងភាពរលូនដល់ពិធីមង្គលការ។', 'An offering to Krong Pealy, guardian spirit of the land, asking for a peaceful and smooth celebration.'],
    ['2027-01-30T15:00', '2027-01-30T16:00', 'ពិធីសូត្រមន្តចំរើនព្រះបរិត្ត', 'Monks\' blessing chant', 'lotus', 'ព្រះសង្ឃសូត្រមន្ត ប្រសិទ្ធពរជ័យ សិរីសួស្តីដល់កូនប្រុស កូនស្រី និងក្រុមគ្រួសារទាំងសងខាង។', 'Monks chant blessings for the couple and both families.'],
    ['2027-01-30T16:00', '2027-01-30T17:00', 'ពិធីជាវខាន់ស្លា', 'Khan Sla ceremony', 'gift', 'ក្រុមគ្រួសារខាងប្រុសនាំខាន់ស្លាមកជម្រាបសួរ និងស្នើសុំកូនស្រីជាផ្លូវការ។', 'The groom’s family presents the Khan Sla tray to formally ask for the bride’s hand.'],
    ['2027-01-30T17:00', '2027-01-30T20:00', 'អញ្ជើញភ្ញៀវកិត្តិយសពិសាអាហារ', 'Dinner for guests of honour', 'food', 'សូមអញ្ជើញពិសាអាហារពេលល្ងាច ជាមួយក្រុមគ្រួសារទាំងសងខាង។', 'Please join both families for dinner.'],
    ['2027-01-31T06:30', '2027-01-31T07:00', 'ជួបជុំភ្ញៀវកិត្តិយស ដើម្បីរៀបចំហែជំនួន', 'Guests gather for the gift procession', 'guests', 'សូមអញ្ជើញមកជួបជុំគ្នា ដើម្បីរៀបចំក្បួនហែជំនួន។', 'Guests gather to prepare the gift procession.'],
    ['2027-01-31T07:00', '2027-01-31T07:30', 'ពិធីហែជំនួន (កំណត់)', 'Gift procession', 'gift', 'ក្បួនហែជំនួនពីខាងប្រុស ឆ្ពោះទៅគេហដ្ឋានខាងស្រី ដោយមានផ្លែឈើ នំចំណី និងតង្វាយ។', 'The groom’s family walks in procession to the bride’s home, carrying fruit, sweets and gifts.'],
    ['2027-01-31T07:30', '2027-01-31T08:00', 'អញ្ជើញភ្ញៀវ កិត្តិយសពិសាអាហារពេលព្រឹក', 'Breakfast for guests of honour', 'food', 'សូមអញ្ជើញពិសាអាហារពេលព្រឹក។', 'Breakfast is served for all guests.'],
    ['2027-01-31T08:00', '2027-01-31T09:00', 'ពិធីសែនដូនតា', 'Ancestor offering ceremony', 'incense', 'ពិធីគោរពដូនតា និងសុំពរជ័យដល់គូស្វាមីភរិយាថ្មី។', 'Honouring the ancestors and asking their blessing for the new couple.'],
    ['2027-01-31T09:00', '2027-01-31T10:00', 'ពិធីកាត់សក់បង្កក់សិរី', 'Hair-cutting ceremony', 'scissors', 'ពិធីកាត់សក់តាមប្រពៃណី ដើម្បីជម្រះអតីតកាល និងចាប់ផ្តើមជីវិតថ្មីរួមគ្នា។', 'A symbolic hair-cutting to cleanse the past and begin a new life together.'],
    ['2027-01-31T10:00', '2027-01-31T12:00', 'ពិធីសែនចងដៃ បង្វិលពពិល និងសំពះផ្ទឹម', 'Knot-tying, Popil circling and Sampeah Phtim', 'knot', 'ភ្ញៀវកិត្តិយសចងអំបោះលើដៃគូស្វាមីភរិយា ជូនពរជ័យ បន្ទាប់មកបង្វិលពពិល និងសំពះផ្ទឹម។', 'Guests tie threads on the couple’s wrists with their blessings, followed by the Popil candle circling and the Sampeah Phtim.'],
    ['2027-01-31T12:00', '2027-01-31T14:00', 'អញ្ជើញភ្ញៀវពិសាអាហារពេលថ្ងៃត្រង់', 'Lunch for guests', 'food', 'សូមអញ្ជើញពិសាអាហារពេលថ្ងៃត្រង់។', 'Lunch is served for all guests.'],
    ['2027-01-31T17:00', '2027-01-31T21:00', 'ទទួលភ្ញៀវកិត្តិយសពិសាភោជនាហារ', 'Wedding reception dinner', 'music', 'ពិធីជប់លៀងអាពាហ៍ពិពាហ៍ ជាមួយភោជនាហារ តន្ត្រី និងការរាំកម្សាន្ត។', 'The wedding banquet, with dinner, music and dancing.'],
  ]
  const blank = { km: '', en: '' }
  const events: WeddingEvent[] = program.map(([start, end, km, en, icon, descKm, descEn], order) => ({
    id: id(), weddingId, order, title: { km, en }, description: { km: descKm, en: descEn }, venue: blank, address: blank,
    start, end, mapUrl: '', imageUrl: '', icon, createdAt: now, updatedAt: now,
  }))

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
