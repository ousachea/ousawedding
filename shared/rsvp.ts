// Sends a guest's RSVP to the couple on Telegram. Server-side only: shared by the Netlify function
// (netlify/functions/rsvp.ts, live site) and the Nitro route (server/api/rsvp.post.ts, dev server).
// The bot token and chat ID are secrets: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env locally
// and in the Netlify site settings, never in the repository.

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Returns the HTTP status to answer with. */
export async function sendRsvp(body: Record<string, unknown> | null): Promise<number> {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = process.env
  if (!token || !chatId) return 503
  if (!body || typeof body !== 'object') return 400
  // Hidden field that people never see; bots fill it in
  if (body.website) return 200
  const name = text(body.name, 120)
  const phone = text(body.phone, 40)
  const message = text(body.message, 1000)
  const guests = Math.min(Math.max(Math.trunc(Number(body.guests)) || 1, 1), 20)
  if (!name || typeof body.attending !== 'boolean') return 400

  const lines = [
    body.attending ? '✅ New RSVP: attending' : '❌ New RSVP: not attending',
    `Name: ${name}`,
    ...(phone ? [`Phone: ${phone}`] : []),
    ...(body.attending ? [`Guests: ${guests}`] : []),
    ...(message ? [`Message: ${message}`] : []),
  ]
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: lines.join('\n') }),
  })
  return res.ok ? 200 : 502
}
