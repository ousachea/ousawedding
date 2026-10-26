// End-to-end checks against the production build using the local data driver.
// Run `npm run build` first, then `npm test`.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4000 + Math.floor(Math.random() * 1000)
const BASE = `http://127.0.0.1:${PORT}`
const PASSWORD = 'test-password-123'
const dataDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'wedding-test-'))
let server: ChildProcess
let cookie = ''
let ipCounter = 0

// Each call gets its own client IP so the rate limiter doesn't interfere, except where tested
async function call(path: string, opts: { method?: string, body?: unknown, auth?: boolean, ip?: string, headers?: Record<string, string>, raw?: BodyInit } = {}) {
  const headers: Record<string, string> = { 'x-forwarded-for': opts.ip ?? `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`, ...opts.headers }
  if (opts.body !== undefined) headers['content-type'] = 'application/json'
  if (opts.auth) headers.cookie = cookie
  const res = await fetch(BASE + path, { method: opts.method ?? 'GET', headers, body: opts.raw ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined), redirect: 'manual' })
  const text = await res.text()
  let json: any
  try { json = JSON.parse(text) } catch {}
  return { status: res.status, json, text, headers: res.headers }
}

before(async () => {
  server = spawn(process.execPath, ['.output/server/index.mjs'], {
    env: {
      ...process.env, PORT: String(PORT), HOST: '127.0.0.1',
      NUXT_DRIVER: 'local', NUXT_PUBLIC_DRIVER: 'local', ALLOW_LOCAL_DRIVER: 'true',
      NUXT_LOCAL_DATA_DIR: dataDir, NUXT_LOCAL_ADMIN_PASSWORD: PASSWORD,
      NUXT_INVITE_SECRET: 'test-invite-secret-0123456789abcdef', NUXT_SESSION_SECRET: 'test-session-secret-0123456789abcdef',
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  })
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${BASE}/api/auth/me`)
      break
    } catch {
      await new Promise(r => setTimeout(r, 250))
    }
  }
  // Wait for the sample wedding seed
  for (let i = 0; i < 40 && (await call('/api/public/weddings/our-wedding')).status !== 200; i++) await new Promise(r => setTimeout(r, 250))
})

after(() => {
  server?.kill()
  rmSync(dataDir, { recursive: true, force: true })
})

let weddingId = ''
let api = ''
let guestId = ''
let token = ''
let inviteUrl = ''

describe('public invitation', () => {
  test('serves the sample wedding without any guest data', async () => {
    const res = await call('/api/public/weddings/our-wedding')
    assert.equal(res.status, 200)
    assert.equal(res.json.wedding.names.en.partner1, 'Ousa Chea')
    assert.equal(res.json.events.length, 3)
    assert.equal(res.json.dateUtc, '2027-02-14T00:00:00.000Z')
    assert.ok(!res.text.includes('Sample Family Chan'), 'guest names must not appear')
    assert.ok(!('published' in res.json.wedding))
  })

  test('unknown wedding is a 404', async () => {
    assert.equal((await call('/api/public/weddings/nope')).status, 404)
  })

  test('server HTML is noindex, Khmer by default, English under /en', async () => {
    const km = await call('/wedding/our-wedding')
    assert.equal(km.status, 200)
    assert.match(km.text, /<html[^>]*lang="km"/)
    assert.match(km.text, /name="robots" content="noindex, nofollow"/)
    assert.match(km.text, /Ousa Chea/)
    const en = await call('/en/wedding/our-wedding')
    assert.match(en.text, /<html[^>]*lang="en"/)
    assert.match(en.text, /Wedding schedule/)
  })

  test('root redirects to the default wedding', async () => {
    const res = await call('/')
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/wedding\/our-wedding$/)
  })

  test('calendar file uses the wedding timezone', async () => {
    const pub = await call('/api/public/weddings/our-wedding')
    const ics = await call(`/api/public/weddings/our-wedding/events/${pub.json.events[0].id}.ics?lang=en`)
    assert.equal(ics.status, 200)
    assert.match(ics.text, /BEGIN:VCALENDAR/)
    assert.match(ics.text, /DTSTART:20270214T000000Z/)
  })

  test('invalid invitation tokens get the same generic error', async () => {
    const a = await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token: 'not-a-real-token' } })
    const b = await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token: 'x'.repeat(32) } })
    assert.equal(a.status, 404)
    assert.equal(a.json.statusMessage, b.json.statusMessage)
  })

  test('RSVP without an invitation is refused when the open form is off', async () => {
    const res = await call('/api/public/rsvp', { method: 'POST', body: { slug: 'our-wedding', name: 'Stranger', attending: true, count: 1 } })
    assert.equal(res.status, 404)
  })
})

describe('admin authentication', () => {
  test('admin APIs require a session', async () => {
    assert.equal((await call('/api/admin/weddings')).status, 401)
    assert.equal((await call('/api/auth/me')).status, 401)
  })

  test('wrong password is rejected', async () => {
    assert.equal((await call('/api/auth/local', { method: 'POST', body: { password: 'nope' } })).status, 401)
  })

  test('correct password signs in', async () => {
    const res = await call('/api/auth/local', { method: 'POST', body: { password: PASSWORD } })
    assert.equal(res.status, 200)
    cookie = (res.headers.getSetCookie?.() ?? []).map(c => c.split(';')[0]).join('; ')
    assert.ok(cookie, 'session cookie set')
    const me = await call('/api/auth/me', { auth: true })
    assert.equal(me.json.role, 'owner')
    const list = await call('/api/admin/weddings', { auth: true })
    weddingId = list.json[0].id
    api = `/api/admin/weddings/${weddingId}`
  })

  test('cross-site writes are blocked', async () => {
    const res = await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'X', side: 'both', group: '', maxAttendees: 1 }, headers: { origin: 'https://evil.example' } })
    assert.equal(res.status, 403)
  })
})

describe('guests and invitations', () => {
  test('creates a guest with validation', async () => {
    const bad = await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: '', side: 'both', group: '', maxAttendees: 0 } })
    assert.equal(bad.status, 400)
    const res = await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'Test Household', side: 'groom', group: 'Friends', maxAttendees: 2 } })
    assert.equal(res.status, 200)
    guestId = res.json.id
  })

  test('creates a personal link; token is stored only as hash + ciphertext', async () => {
    const res = await call(`${api}/invitations`, { method: 'POST', auth: true, body: { guestIds: [guestId] } })
    assert.equal(res.json.created.length, 1)
    inviteUrl = res.json.created[0].url
    token = new URL(inviteUrl).searchParams.get('invite')!
    assert.ok(token.length >= 32)
    const backup = await call(`${api}/backup`, { auth: true })
    assert.ok(!backup.text.includes(token), 'raw token must not be stored')
    // Creating again without regenerate keeps the same link
    const again = await call(`${api}/invitations`, { method: 'POST', auth: true, body: { guestIds: [guestId] } })
    assert.equal(again.json.created.length, 0)
  })

  test('resolving the link returns only that guest and marks it viewed', async () => {
    const res = await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token } })
    assert.equal(res.status, 200)
    assert.deepEqual(Object.keys(res.json).sort(), ['canEdit', 'guestName', 'locale', 'maxAttendees', 'rsvp'])
    assert.equal(res.json.guestName, 'Test Household')
    assert.equal(res.json.maxAttendees, 2)
    const guests = await call(`${api}/guests`, { auth: true })
    assert.equal(guests.json.guests.find((g: any) => g.id === guestId).invitation.status, 'viewed')
  })

  test('the guest name never appears in server HTML, even with the token', async () => {
    const page = await call(`/wedding/our-wedding?invite=${token}`)
    assert.equal(page.status, 200)
    assert.ok(!page.text.includes('Test Household'))
  })
})

describe('RSVP rules', () => {
  const rsvp = (body: object, ip?: string) => call('/api/public/rsvp', { method: 'POST', ip, body: { slug: 'our-wedding', token, ...body } })

  test('enforces the guest limit on the server', async () => {
    const res = await rsvp({ attending: true, count: 3 })
    assert.equal(res.status, 400)
    assert.equal(res.json.data.code, 'limit')
    assert.equal((await rsvp({ attending: true, count: 0 })).status, 400)
  })

  test('validates input types', async () => {
    assert.equal((await rsvp({ attending: 'yes', count: 1 })).status, 400)
  })

  test('saves, then updates the same record', async () => {
    const first = await rsvp({ attending: true, count: 2, attendeeNames: ['A', 'B', 'C'], dietary: 'Vegetarian', message: 'Congrats' })
    assert.equal(first.status, 200)
    assert.equal(first.json.updated, false)
    const second = await rsvp({ attending: true, count: 1 })
    assert.equal(second.json.updated, true)
    const res = await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token } })
    assert.equal(res.json.rsvp.count, 1)
  })

  test('concurrent duplicate submissions leave exactly one RSVP', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => rsvp({ attending: true, count: 2 })))
    assert.ok(results.every(r => r.status === 200))
    const csv = await call(`${api}/rsvps/export.csv`, { auth: true })
    assert.equal(csv.text.split('\r\n').filter(l => l.startsWith('Test Household')).length, 1)
  })

  test('stats reflect the stored responses', async () => {
    const stats = await call(`${api}/stats`, { auth: true })
    assert.equal(stats.json.guests, 4)
    assert.equal(stats.json.attendingPeople, 2)
    assert.equal(stats.json.pending, 3)
    assert.equal(stats.json.responseRate, 25)
  })

  test('locks responses when updates are disabled', async () => {
    const w = (await call(api, { auth: true })).json
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: { ...w.rsvp, allowUpdates: false } } })
    const res = await rsvp({ attending: false, count: 0 })
    assert.equal(res.status, 409)
    assert.equal(res.json.data.code, 'locked')
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: { ...w.rsvp, allowUpdates: true } } })
  })

  test('rejects RSVPs after the deadline', async () => {
    const w = (await call(api, { auth: true })).json
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: { ...w.rsvp, deadline: '2020-01-01T00:00' } } })
    const res = await rsvp({ attending: true, count: 1 })
    assert.equal(res.status, 409)
    assert.equal(res.json.data.code, 'deadline')
    const pub = await call('/api/public/weddings/our-wedding')
    assert.equal(pub.json.deadlinePassed, true)
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: w.rsvp } })
  })

  test('rate limits repeated submissions from one client', async () => {
    const statuses = []
    for (let i = 0; i < 12; i++) statuses.push((await rsvp({ attending: true, count: 1 }, '203.0.113.9')).status)
    assert.ok(statuses.includes(429))
  })
})

describe('link lifecycle', () => {
  test('regenerating invalidates the old link and keeps the RSVP', async () => {
    const res = await call(`${api}/invitations`, { method: 'POST', auth: true, body: { guestIds: [guestId], regenerate: true } })
    const newToken = new URL(res.json.created[0].url).searchParams.get('invite')!
    assert.equal((await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token } })).status, 404)
    const ok = await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token: newToken } })
    assert.equal(ok.status, 200)
    assert.ok(ok.json.rsvp, 'RSVP survives regeneration')
    token = newToken
  })

  test('revoking stops the link', async () => {
    const guests = await call(`${api}/guests`, { auth: true })
    const inv = guests.json.guests.find((g: any) => g.id === guestId).invitation
    await call(`${api}/invitations/${inv.id}`, { method: 'PATCH', auth: true, body: { status: 'revoked' } })
    assert.equal((await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token } })).status, 404)
    assert.equal((await call('/api/public/rsvp', { method: 'POST', body: { slug: 'our-wedding', token, attending: true, count: 1 } })).status, 404)
  })

  test('archived guests lose access and can only then be deleted', async () => {
    const res = await call(`${api}/invitations`, { method: 'POST', auth: true, body: { guestIds: [guestId] } })
    token = new URL(res.json.created[0].url).searchParams.get('invite')!
    assert.equal((await call(`${api}/guests/${guestId}`, { method: 'DELETE', auth: true })).status, 409)
    await call(`${api}/guests/bulk`, { method: 'POST', auth: true, body: { ids: [guestId], action: 'archive' } })
    assert.equal((await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token } })).status, 404)
    assert.equal((await call(`${api}/stats`, { auth: true })).json.guests, 3)
    await call(`${api}/guests/bulk`, { method: 'POST', auth: true, body: { ids: [guestId], action: 'restore' } })
    assert.equal((await call('/api/public/invitation', { method: 'POST', body: { slug: 'our-wedding', token } })).status, 200)
  })
})

describe('open RSVP form', () => {
  test('works when enabled, with its own limit and idempotent retries', async () => {
    const w = (await call(api, { auth: true })).json
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: { ...w.rsvp, allowGeneral: true, generalMaxAttendees: 2 } } })
    const body = { slug: 'our-wedding', name: 'Walk-in Guest', attending: true, count: 2, submissionId: 'retry-test-0001' }
    assert.equal((await call('/api/public/rsvp', { method: 'POST', body: { ...body, count: 3 } })).status, 400)
    assert.equal((await call('/api/public/rsvp', { method: 'POST', body: { ...body, name: '' } })).status, 400)
    assert.equal((await call('/api/public/rsvp', { method: 'POST', body })).json.updated, false)
    assert.equal((await call('/api/public/rsvp', { method: 'POST', body })).json.updated, true)
    const g = await call(`${api}/guests`, { auth: true })
    assert.equal(g.json.general.length, 1)
  })
})

describe('exports and isolation', () => {
  test('CSV export is UTF-8 with BOM and neutralises formulas', async () => {
    await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: '=HYPERLINK("http://x")', side: 'both', group: 'គ្រួសារ', maxAttendees: 1 } })
    const csv = await call(`${api}/guests/export.csv`, { auth: true })
    // fetch's text() drops the BOM, so check the raw bytes
    const raw = Buffer.from(await (await fetch(`${BASE}${api}/guests/export.csv`, { headers: { cookie } })).arrayBuffer())
    assert.equal(raw.subarray(0, 3).toString('hex'), 'efbbbf')
    assert.ok(csv.text.startsWith('name,'))
    assert.match(csv.text, /"'=HYPERLINK\(""http:\/\/x""\)"/)
    assert.match(csv.text, /គ្រួសារ/)
  })

  test('records from one wedding cannot be edited through another', async () => {
    const other = await call('/api/admin/weddings', { method: 'POST', auth: true, body: { slug: 'second-wedding' } })
    assert.equal(other.status, 200)
    const res = await call(`/api/admin/weddings/${other.json.id}/guests/${guestId}`, { method: 'PATCH', auth: true, body: { name: 'Hijack' } })
    assert.equal(res.status, 404)
    // New weddings start unpublished: hidden from the public, previewable by admins
    assert.equal((await call('/api/public/weddings/second-wedding')).status, 404)
    const preview = await call('/api/public/weddings/second-wedding', { auth: true })
    assert.equal(preview.status, 200)
    assert.equal(preview.json.preview, true)
  })

  test('gallery upload checks the real file type', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b40000000049454e44ae426082', 'hex')
    const form = (img: Blob) => {
      const f = new FormData()
      f.append('image', img, 'a.png')
      f.append('thumb', new Blob([png], { type: 'image/png' }), 't.png')
      f.append('width', '1')
      f.append('height', '1')
      return f
    }
    const fake = await call(`${api}/gallery`, { method: 'POST', auth: true, raw: form(new Blob(['<script>'], { type: 'image/png' })) })
    assert.equal(fake.status, 400)
    const ok = await call(`${api}/gallery`, { method: 'POST', auth: true, raw: form(new Blob([png], { type: 'image/png' })) })
    assert.equal(ok.status, 200)
    const file = await fetch(BASE + ok.json.url)
    assert.equal(file.status, 200)
    assert.equal(file.headers.get('content-type'), 'image/png')
    assert.equal((await call(`${api}/gallery/${ok.json.id}`, { method: 'DELETE', auth: true })).status, 200)
    assert.equal((await fetch(BASE + ok.json.url)).status, 404)
  })

  test('sign out ends the session', async () => {
    await call('/api/auth/session', { method: 'DELETE', auth: true })
    const res = await call('/api/admin/weddings', { headers: { cookie: '' } })
    assert.equal(res.status, 401)
  })
})
