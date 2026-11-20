// Sends a guest's RSVP to the couple on Telegram. Server-side only: shared by the Netlify functions
// (netlify/functions/, live site) and the Nitro routes (server/api/, dev server).
// One bot serves every couple. Each wedding names its couple's chat (telegramChatId); without one, alerts
// go to the site owner's chat. The bot token and the owner's chat ID are secrets: TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID in .env locally and in the Netlify site settings, never in the repository.

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Messages use Telegram's HTML formatting, so anything a guest typed is escaped first
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// The page the guest was on, as a tappable link. Only a link on this same site is accepted, so nobody
// can slip a link to somewhere else into the couple's chat.
function pageLink(v: unknown, host: string | undefined): string[] {
  if (typeof v !== 'string' || !host) return []
  try {
    const url = new URL(v)
    if (url.host !== host || !/^https?:$/.test(url.protocol)) return []
    url.hash = ''
    return [`🔗 <a href="${esc(url.href).replace(/"/g, '&quot;')}">Open their invitation</a>`]
  } catch {
    return []
  }
}
// Cambodia time, whatever timezone the server runs in
const cambodiaTime = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

/** The wedding an alert belongs to: whose names head the message, and which chat it goes to */
export interface AlertWedding { names: { en: { partner1: string, partner2: string } }, telegramChatId?: string, isSample?: boolean }

/** The wedding with this address, from all weddings (content/weddings.json) */
export const alertWeddingBySlug = (all: Record<string, AlertWedding & { slug: string }>, slug: unknown): AlertWedding | null =>
  Object.values(all).find(w => w.slug === slug) ?? null

/** Sends one message to the couple's chat (or the owner's); returns the HTTP status to answer with. */
async function telegram(lines: string[], wedding: AlertWedding | null | undefined): Promise<number> {
  // Sample invitations (the styles on the home page) are for trying out: replies go nowhere
  if (wedding?.isSample) return 200
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = wedding?.telegramChatId || process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return 503
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    // No preview card for the link: the message stays short
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
  })
  return res.ok ? 200 : 502
}

/** Where the request came from: `host` is the site serving it (for the page link), `wedding` the couple, `now` the time shown */
export interface AlertContext { host?: string, wedding?: AlertWedding | null, now?: Date }

// The couple's names under the heading, so an owner looking after several couples can tell alerts apart
const coupleLine = (w: AlertWedding | null | undefined) => (w ? [`💍 ${esc(w.names.en.partner1)} &amp; ${esc(w.names.en.partner2)}`] : [])

/** A guest opened their personal link: { name, lang, url }. The page sends it once per browser. */
export async function sendOpened(body: Record<string, unknown> | null, { host, wedding, now = new Date() }: AlertContext = {}): Promise<number> {
  const name = text(body?.name, 120)
  if (!name) return 400
  return telegram([
    '👀 <b>Invitation opened</b>',
    ...coupleLine(wedding),
    '',
    `👤 <b>${esc(name)}</b>`,
    `🌐 ${body!.lang === 'km' ? 'Khmer' : 'English'} invitation`,
    `🕒 ${cambodiaTime(now)}`,
    ...pageLink(body!.url, host),
  ], wedding)
}

/** Returns the HTTP status to answer with. */
export async function sendRsvp(body: Record<string, unknown> | null, { host, wedding, now = new Date() }: AlertContext = {}): Promise<number> {
  if (!wedding?.isSample && (!process.env.TELEGRAM_BOT_TOKEN || !(wedding?.telegramChatId || process.env.TELEGRAM_CHAT_ID))) return 503
  if (!body || typeof body !== 'object') return 400
  // Hidden field that people never see; bots fill it in
  if (body.website) return 200
  const name = text(body.name, 120)
  const phone = text(body.phone, 40)
  const message = text(body.message, 1000)
  const guests = Math.min(Math.max(Math.trunc(Number(body.guests)) || 1, 1), 20)
  if (!name || typeof body.attending !== 'boolean') return 400

  return telegram([
    body.attending ? '✅ <b>New reply: coming</b>' : '❌ <b>New reply: can’t come</b>',
    ...coupleLine(wedding),
    '',
    `👤 <b>${esc(name)}</b>`,
    ...(body.attending ? [`👥 ${guests} ${guests === 1 ? 'guest' : 'guests'}`] : []),
    ...(phone ? [`📞 ${esc(phone)}`] : []),
    ...(message ? ['', `💬 <i>${esc(message)}</i>`] : []),
    '',
    `🕒 ${cambodiaTime(now)}`,
    ...pageLink(body.url, host),
  ], wedding)
}

/** A couple asks about an invitation from the home page's contact form; it goes to the site owner */
export async function sendContact(body: Record<string, unknown> | null, { now = new Date() }: AlertContext = {}): Promise<number> {
  if (!body || typeof body !== 'object') return 400
  // Hidden field that people never see; bots fill it in
  if (body.website) return 200
  const name = text(body.name, 120)
  const reach = text(body.reach, 120)
  const date = text(body.date, 10)
  const style = text(body.style, 20)
  const message = text(body.message, 2000)
  const ADDONS: Record<string, string> = { envelope: 'Letter for each guest', languages: 'Khmer language', schedule: 'Schedule and map', gallery: 'Photos', music: 'Background music', replies: 'Alerts on Telegram', gift: 'KHQR gifts' }
  const addons = Array.isArray(body.addons) ? body.addons.filter(a => typeof a === 'string' && a in ADDONS).map(a => ADDONS[a]!) : []
  if (!name || !reach) return 400
  return telegram([
    '💌 <b>New enquiry</b>',
    '',
    `👤 <b>${esc(name)}</b>`,
    `📞 ${esc(reach)}`,
    ...(/^\d{4}-\d{2}-\d{2}$/.test(date) ? [`💍 Wedding on ${new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}`] : []),
    ...(['classic', 'floral', 'ruby'].includes(style) ? [`🎨 Likes the ${style[0]!.toUpperCase()}${style.slice(1)} style`] : []),
    ...(addons.length ? [`➕ Add-ons: ${addons.join(', ')}`] : []),
    ...(message ? ['', `💬 <i>${esc(message)}</i>`] : []),
    '',
    `🕒 ${cambodiaTime(now)}`,
  ], null)
}
