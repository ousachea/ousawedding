import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alertWeddingBySlug, sendOpened, sendRsvp } from '../shared/rsvp.ts'

test('opened links and replies are sent to Telegram as escaped HTML', async () => {
  const sent: string[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: RequestInit) => { sent.push(JSON.parse(init.body as string).text); return new Response('{}') }) as typeof fetch
  const host = 'theab-online.netlify.app'
  process.env.TELEGRAM_BOT_TOKEN = 'x'
  process.env.TELEGRAM_CHAT_ID = '1'
  try {
    const at = new Date('2026-11-18T16:45:00Z') // 23:45 in Phnom Penh
    assert.equal(await sendOpened({ name: '  Mr. & Mrs. <Sok> ', lang: 'km', url: `https://${host}/km/ousa-kanha/?to=Mr&with=wife#rsvp` }, { host, now: at }), 200)
    assert.equal(sent.pop(), `👀 <b>Invitation opened</b>\n\n👤 <b>Mr. &amp; Mrs. &lt;Sok&gt;</b>\n🌐 Khmer invitation\n🕒 Wed, 18 Nov 2026, 11:45 pm\n🔗 <a href="https://${host}/km/ousa-kanha/?to=Mr&amp;with=wife">Open their invitation</a>`)
    // A link to another site is dropped
    assert.equal(await sendOpened({ name: 'Sok', url: 'https://evil.example/ousa-kanha/' }, { host, now: at }), 200)
    assert.ok(!sent.pop()!.includes('🔗'))
    assert.equal(await sendRsvp({ name: 'Dara', attending: true, guests: 2, phone: '012', message: 'See you <3' }, { now: at }), 200)
    assert.equal(sent.pop(), '✅ <b>New reply: coming</b>\n\n👤 <b>Dara</b>\n👥 2 guests\n📞 012\n\n💬 <i>See you &lt;3</i>\n\n🕒 Wed, 18 Nov 2026, 11:45 pm')
    assert.equal(await sendOpened({ name: '' }), 400)
    assert.equal(await sendOpened(null), 400)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('each couple gets their own alerts, headed by their names; without a chat they go to the owner', async () => {
  const sent: Array<{ chat_id: string, text: string }> = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: RequestInit) => { sent.push(JSON.parse(init.body as string)); return new Response('{}') }) as typeof fetch
  process.env.TELEGRAM_BOT_TOKEN = 'x'
  process.env.TELEGRAM_CHAT_ID = 'owner'
  const weddings = {
    a: { slug: 'dara-sophea', names: { en: { partner1: 'Dara', partner2: 'Sophea' } }, telegramChatId: '555' },
    b: { slug: 'sok-nita', names: { en: { partner1: 'Sok', partner2: 'Nita' } }, telegramChatId: '' },
  }
  try {
    assert.equal(await sendRsvp({ name: 'Vanna', attending: false }, { wedding: alertWeddingBySlug(weddings, 'dara-sophea') }), 200)
    assert.equal(sent[0]!.chat_id, '555')
    assert.ok(sent[0]!.text.startsWith('❌ <b>New reply: can’t come</b>\n💍 Dara &amp; Sophea\n'))
    assert.equal(await sendOpened({ name: 'Vanna' }, { wedding: alertWeddingBySlug(weddings, 'sok-nita') }), 200)
    assert.equal(sent[1]!.chat_id, 'owner')
    assert.ok(sent[1]!.text.includes('💍 Sok &amp; Nita'))
    assert.equal(alertWeddingBySlug(weddings, 'nobody'), null)
    // No couple chat and no owner chat: nowhere to send
    delete process.env.TELEGRAM_CHAT_ID
    assert.equal(await sendOpened({ name: 'Vanna' }, { wedding: alertWeddingBySlug(weddings, 'sok-nita') }), 503)
    assert.equal(await sendOpened({ name: 'Vanna' }, { wedding: alertWeddingBySlug(weddings, 'dara-sophea') }), 200)
    delete process.env.TELEGRAM_BOT_TOKEN
    assert.equal(await sendOpened({ name: 'A' }), 503)
  } finally {
    globalThis.fetch = realFetch
  }
})
