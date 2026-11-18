// Sends a guest's RSVP to the couple on Telegram. Server-side only: shared by the Netlify function
// (netlify/functions/rsvp.ts, live site) and the Nitro route (server/api/rsvp.post.ts, dev server).
// The bot token and chat ID are secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env locally
// and in the Netlify site settings, never in the repository.

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

// Messages use Telegram's HTML formatting, so anything a guest typed is escaped first
const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
// Cambodia time, whatever timezone the server runs in
const cambodiaTime = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

/** Sends one message to the couple's chat; returns the HTTP status to answer with. */
async function telegram(lines: string[]): Promise<number> {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = process.env
  if (!token || !chatId) return 503
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n'), parse_mode: 'HTML' }),
  })
  return res.ok ? 200 : 502
}

/** A guest opened their personal link: { name, lang }. The page sends it once per browser. */
export async function sendOpened(body: Record<string, unknown> | null, now = new Date()): Promise<number> {
  const name = text(body?.name, 120)
  if (!name) return 400
  return telegram([
    '👀 <b>Invitation opened</b>',
    '',
    `👤 <b>${esc(name)}</b>`,
    `🌐 ${body!.lang === 'km' ? 'Khmer' : 'English'} invitation`,
    `🕒 ${cambodiaTime(now)}`,
  ])
}

/** Returns the HTTP status to answer with. */
export async function sendRsvp(body: Record<string, unknown> | null, now = new Date()): Promise<number> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return 503
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
    '',
    `👤 <b>${esc(name)}</b>`,
    ...(body.attending ? [`👥 ${guests} ${guests === 1 ? 'guest' : 'guests'}`] : []),
    ...(phone ? [`📞 ${esc(phone)}`] : []),
    ...(message ? ['', `💬 <i>${esc(message)}</i>`] : []),
    '',
    `🕒 ${cambodiaTime(now)}`,
  ])
}
