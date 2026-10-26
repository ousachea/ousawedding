import { z } from 'zod'

const text = (max: number) => z.string().trim().max(max)
const localized = (max: number) => z.object({ km: text(max), en: text(max) })
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use YYYY-MM-DDTHH:mm')
const url = z.union([z.literal(''), z.string().trim().max(2000).refine(v => /^https?:\/\//.test(v) || v.startsWith('/'), 'Must be a URL')])
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const locale = z.enum(['km', 'en'])

export const rsvpSchema = z.object({
  slug: text(100),
  token: z.string().max(100).optional(),
  // Lets a retried request overwrite its own general RSVP instead of creating a duplicate
  submissionId: z.string().regex(/^[\w-]{8,64}$/).optional(),
  name: text(120).optional(),
  attending: z.boolean(),
  count: z.number().int().min(0).max(50),
  attendeeNames: z.array(text(120)).max(50).default([]),
  dietary: text(500).default(''),
  message: text(1000).default(''),
})

export const weddingSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes').max(60)
    // The invitation lives at /<slug>, so it can't take a path the site already uses
    .refine(s => !['admin', 'api', 'en', 'km', 'wedding'].includes(s), 'This web address is reserved'),
  names: z.object({
    km: z.object({ partner1: text(80), partner2: text(80), parents1: text(300).default(''), parents2: text(300).default('') }),
    en: z.object({ partner1: text(80), partner2: text(80), parents1: text(300).default(''), parents2: text(300).default('') }),
  }),
  monogram: text(12),
  date: localDateTime,
  timezone: z.string().refine(isValidTimeZone, 'Unknown timezone'),
  content: z.object({
    km: z.object({ message: text(2000), dressCode: text(500), instructions: text(2000), story: text(4000), thanks: text(3000).default(''), apology: text(3000).default('') }),
    en: z.object({ message: text(2000), dressCode: text(500), instructions: text(2000), story: text(4000), thanks: text(3000).default(''), apology: text(3000).default('') }),
  }),
  coverImage: url,
  coverPosition: z.string().regex(/^\d{1,3}(\.\d)?% \d{1,3}(\.\d)?%$/).default('50% 50%'),
  theme: z.object({
    background: color, accent: color, secondary: color, tertiary: color, text: color,
    headingFont: z.enum(['serif', 'sans']),
    motif: z.enum(['lotus', 'kbach', 'none']),
    style: z.enum(['classic', 'floral']).default('classic'),
  }),
  defaultLocale: locale,
  rsvp: z.object({
    deadline: localDateTime,
    allowUpdates: z.boolean(),
    allowGeneral: z.boolean(),
    generalMaxAttendees: z.number().int().min(1).max(20),
    askDietary: z.boolean(),
  }),
  privacy: z.object({ allowIndexing: z.boolean() }),
  textOrder: z.array(z.enum(TEXT_BLOCKS)).length(TEXT_BLOCKS.length).refine(o => new Set(o).size === o.length, 'Each block once').default([...TEXT_BLOCKS]),
  published: z.boolean(),
  musicUrl: url,
  contact: z.object({ name: text(120), phone: text(40), email: z.union([z.literal(''), z.email()]) }),
  share: z.object({
    km: z.object({ title: text(120), description: text(300) }),
    en: z.object({ title: text(120), description: text(300) }),
  }),
})

export const eventSchema = z.object({
  title: localized(120),
  description: localized(1000),
  venue: localized(200),
  address: localized(400),
  start: localDateTime,
  end: localDateTime,
  mapUrl: url,
  imageUrl: url,
  icon: z.enum(EVENT_ICONS).default('calendar'),
}).refine(e => e.end >= e.start, { message: 'End must be after start', path: ['end'] })

export const guestSchema = z.object({
  name: text(120).min(1),
  side: z.enum(['bride', 'groom', 'both']),
  group: text(60),
  householdId: text(60).default(''),
  maxAttendees: z.number().int().min(1).max(20),
  phone: text(40).default(''),
  email: z.union([z.literal(''), z.email()]).default(''),
  notes: text(1000).default(''),
})

export const manualRsvpSchema = z.object({
  attending: z.boolean(),
  count: z.number().int().min(0).max(50),
  attendeeNames: z.array(text(120)).max(50).default([]),
  dietary: text(500).default(''),
  message: text(1000).default(''),
})

export const galleryPatchSchema = z.object({
  caption: localized(300).optional(),
  alt: localized(300).optional(),
  visible: z.boolean().optional(),
})

export const reorderSchema = z.object({ ids: z.array(z.string().max(64)).max(1000) })

export const adminInviteSchema = z.object({ email: z.email(), role: z.enum(['owner', 'editor']) })

/** Validates the body with a schema, turning failures into a 400 with field paths. */
export async function readBody$<T extends z.ZodType>(event: Parameters<typeof readBody>[0], schema: T): Promise<z.infer<T>> {
  const result = schema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: { issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
    })
  }
  return result.data
}

/**
 * Like readBody$ for partial updates: keeps only the top-level fields the client sent.
 * Zod 4 fills `.default()`s even under `.partial()`, which would overwrite stored values the client never touched.
 */
export async function readPatch$<T extends z.ZodObject>(event: Parameters<typeof readBody>[0], schema: T): Promise<Partial<z.infer<T>>> {
  const raw = await readBody(event)
  const result = schema.partial().safeParse(raw)
  if (!result.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid input',
      data: { issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
    })
  }
  const sent = new Set(raw && typeof raw === 'object' ? Object.keys(raw) : [])
  return Object.fromEntries(Object.entries(result.data).filter(([k]) => sent.has(k))) as Partial<z.infer<T>>
}
