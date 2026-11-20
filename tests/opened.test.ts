import { test } from 'node:test'
import assert from 'node:assert/strict'
import { alertWeddingBySlug, replyKey, sendContact, sendOpened, sendRsvp, type Reply, type ReplyStore } from '../shared/rsvp.ts'

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
    // Sample invitations answer as if sent, but send nothing
    assert.equal(await sendRsvp({ name: 'Vanna', attending: true }, { wedding: { ...weddings.a, isSample: true } }), 200)
    assert.equal(sent.length, 2)
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

test('contact form enquiries go to the owner, escaped, with a readable wedding date', async () => {
  const sent: Array<{ chat_id: string, text: string }> = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: RequestInit) => { sent.push(JSON.parse(init.body as string)); return new Response('{}') }) as typeof fetch
  process.env.TELEGRAM_BOT_TOKEN = 'x'
  process.env.TELEGRAM_CHAT_ID = 'owner'
  try {
    const at = new Date('2026-11-18T16:45:00Z')
    assert.equal(await sendContact({ name: 'Dara <3', reach: '012 345 678', date: '2027-02-14', style: 'ruby', message: 'Hi' }, { now: at }), 200)
    assert.equal(sent[0]!.chat_id, 'owner')
    assert.equal(sent[0]!.text, '💌 <b>New enquiry</b>\n\n👤 <b>Dara &lt;3</b>\n📞 012 345 678\n💍 Wedding on Sun, 14 Feb 2027\n🎨 Likes the Ruby style\n\n💬 <i>Hi</i>\n\n🕒 Wed, 18 Nov 2026, 11:45 pm')
    assert.equal(await sendContact({ name: 'Sok', reach: '@sok', addons: ['replies', 'gift', 'nope'] }, { now: at }), 200)
    assert.ok(sent[1]!.text.includes('➕ Add-ons: Alerts on Telegram, KHQR gifts'))
    sent.pop()
    assert.equal(await sendContact({ name: 'Dara', reach: '' }), 400)
    assert.equal(await sendContact({ name: 'Bot', reach: 'x', website: 'spam' }), 200)
    assert.equal(sent.length, 1)
  } finally {
    globalThis.fetch = realFetch
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
  }
})

test('replies are kept, one per guest, and each alert ends with the running total', async () => {
  const sent: string[] = []
  const realFetch = globalThis.fetch
  const files: FormData[] = []
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    if (init.body instanceof FormData) files.push(init.body)
    else sent.push(JSON.parse(init.body as string).text)
    return new Response('{}')
  }) as typeof fetch
  process.env.TELEGRAM_BOT_TOKEN = 'x'
  process.env.TELEGRAM_CHAT_ID = 'owner'
  const kept = new Map<string, Reply>()
  const store: ReplyStore = {
    async save(slug, r) { const had = kept.has(replyKey(slug, r.name)); kept.set(replyKey(slug, r.name), r); return had },
    async list(slug) { return [...kept].filter(([k]) => k.startsWith(`${slug}/`)).map(([, r]) => r) },
  }
  const wedding = { slug: 'dara-sophea', names: { en: { partner1: 'Dara', partner2: 'Sophea' } } }
  try {
    assert.equal(await sendRsvp({ name: 'Vanna', attending: true, guests: 2 }, { wedding, store }), 200)
    assert.ok(sent.at(-1)!.startsWith('✅ <b>New reply: coming</b>'))
    assert.ok(sent.at(-1)!.endsWith('\n\n📊 <b>So far</b>\n👥 <b>2 people coming</b> (1 reply)\n❌ 0 can’t come\n\n✅ <b>Coming</b> (1 reply · 2 people)\n1. Vanna 👥 2'))
    assert.equal(await sendRsvp({ name: 'Sok', attending: false, guests: 3 }, { wedding, store }), 200)
    assert.ok(sent.at(-1)!.endsWith('👥 <b>2 people coming</b> (1 reply)\n❌ 1 can’t come\n\n✅ <b>Coming</b> (1 reply · 2 people)\n1. Vanna 👥 2\n\n❌ <b>Can’t come</b> (1)\n1. Sok'))
    // The same guest again (any case or spacing) replaces their reply; someone not coming brings no guests
    assert.equal(await sendRsvp({ name: '  vanna ', attending: false }, { wedding, store }), 200)
    assert.ok(sent.at(-1)!.startsWith('❌ <b>Changed reply: can’t come</b>'))
    // Their new answer counts, under the name they gave last
    assert.ok(sent.at(-1)!.endsWith('👥 <b>0 people coming</b> (0 replies)\n❌ 2 can’t come\n\n❌ <b>Can’t come</b> (2)\n1. Sok\n2. vanna'))
    assert.equal(kept.size, 2)
    assert.equal(kept.get(replyKey('dara-sophea', 'Sok'))!.guests, 0)
    // A long list stops short of Telegram's limit and says how many more there are
    for (let i = 0; i < 150; i++) await store.save('dara-sophea', { name: `Guest number ${i} <x>`, attending: true, guests: 1, phone: '', message: '', at: `2026-01-01T00:00:${String(i % 60).padStart(2, '0')}Z` })
    await sendRsvp({ name: 'Mey', attending: true }, { wedding, store })
    assert.ok(sent.at(-1)!.length < 4096)
    assert.match(sent.at(-1)!, /\n… \+ \d+ more \(full list attached\)\n\n❌/)
    assert.ok(sent.at(-1)!.includes('&lt;x&gt;'))
    // …and everyone follows in an Excel file, every name in it (its sheet is stored uncompressed)
    assert.equal(files.length, 1)
    const doc = files[0]!.get('document') as File
    assert.equal(doc.name, 'dara-sophea-replies.xlsx')
    const sheet = Buffer.from(await doc.arrayBuffer())
    assert.equal(sheet.subarray(0, 2).toString(), 'PK')
    const text = sheet.toString('utf8')
    assert.ok(text.includes('<t xml:space="preserve">Guest number 149 &lt;x&gt;</t>'))
    assert.ok(text.includes('<t xml:space="preserve">Mey</t>'))
    assert.ok(text.includes('<t xml:space="preserve">151 coming · 2 can’t come</t>'))
    // Lists that fit send no file
    assert.equal(sent.filter(t => t.includes('full list attached')).length, 1)
    // Samples keep nothing
    kept.clear()
    assert.equal(await sendRsvp({ name: 'Nita', attending: true }, { wedding: { ...wedding, isSample: true }, store }), 200)
    assert.equal(kept.size, 0)
    // A store that fails still lets the alert out, without the total
    const broken: ReplyStore = { save: async () => { throw new Error('down') }, list: async () => [] }
    const realError = console.error
    console.error = () => {}
    try { assert.equal(await sendRsvp({ name: 'Lina', attending: true }, { wedding, store: broken }), 200) } finally { console.error = realError }
    assert.ok(!sent.at(-1)!.includes('📊'))
  } finally {
    globalThis.fetch = realFetch
  }
})

test('a reply brings at most 4 people', async () => {
  const sent: string[] = []
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (_url: string, init: RequestInit) => { sent.push(JSON.parse(init.body as string).text); return new Response('{}') }) as typeof fetch
  process.env.TELEGRAM_BOT_TOKEN = 'x'
  process.env.TELEGRAM_CHAT_ID = '1'
  try {
    await sendRsvp({ name: 'Dara', attending: true, guests: 12 })
    assert.ok(sent.at(-1)!.includes('👥 4 guests'))
    await sendRsvp({ name: 'Dara', attending: true, guests: 0 })
    assert.ok(sent.at(-1)!.includes('👥 1 guest\n'))
  } finally {
    globalThis.fetch = realFetch
  }
})
