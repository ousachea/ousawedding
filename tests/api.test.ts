// End-to-end checks of the admin API and the server-rendered pages, with content in temporary folders.
// Run `npm run build:server` first, then `npm test`.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PORT = 4000 + Math.floor(Math.random() * 1000)
const BASE = `http://127.0.0.1:${PORT}`
const PASSWORD = 'test-password-123'
const dataDir = mkdtempSync(join(process.env.TMPDIR ?? tmpdir(), 'wedding-test-'))
const [contentDir, privateDir, uploadsDir] = ['content', 'private', 'uploads'].map(d => join(dataDir, d))
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
      NUXT_CONTENT_DIR: contentDir, NUXT_LOCAL_DATA_DIR: privateDir, NUXT_UPLOADS_DIR: uploadsDir,
      NUXT_LOCAL_ADMIN_PASSWORD: PASSWORD, NUXT_SESSION_SECRET: 'test-session-secret-0123456789abcdef',
      // The sample wedding is seeded at this address, whatever the real site's default is
      NUXT_PUBLIC_DEFAULT_WEDDING_SLUG: 'our-wedding',
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

describe('public invitation', () => {
  test('serves the sample wedding without any guest data', async () => {
    const res = await call('/api/public/weddings/our-wedding')
    assert.equal(res.status, 200)
    assert.equal(res.json.wedding.names.en.partner1, 'Ousa Chea')
    assert.equal(res.json.events.length, 12)
    assert.equal(res.json.dateUtc, '2027-01-31T00:00:00.000Z')
    assert.ok(!res.text.includes('Sample Family Chan'), 'guest names must not appear')
  })

  test('the guest list is kept apart from the published content', async () => {
    assert.ok(existsSync(join(contentDir, 'weddings.json')))
    assert.ok(!existsSync(join(contentDir, 'guests.json')), 'guests must never land in content/')
    assert.ok(existsSync(join(privateDir, 'guests.json')))
  })

  test('unknown wedding is a 404', async () => {
    assert.equal((await call('/api/public/weddings/nope')).status, 404)
  })

  test('server HTML is noindex, English by default, Khmer under /km', async () => {
    const en = await call('/our-wedding')
    assert.equal(en.status, 200)
    assert.match(en.text, /<html[^>]*lang="en"/)
    assert.match(en.text, /name="robots" content="noindex, nofollow"/)
    assert.match(en.text, /Ousa Chea/)
    assert.match(en.text, /Wedding schedule/)
    const km = await call('/km/our-wedding')
    assert.match(km.text, /<html[^>]*lang="km"/)
  })

  test('root redirects to the default wedding', async () => {
    // A server redirect, or (static site) a pre-built page that refreshes to it
    const res = await call('/')
    if (res.status === 302) assert.match(res.headers.get('location') ?? '', /\/our-wedding$/)
    // (built with the default wedding address from the build's settings)
    else assert.match(res.text, /http-equiv="refresh" content="0; url=\/[a-z0-9-]+"/)
  })

  test('old /wedding/ links redirect and keep the query', async () => {
    const res = await call('/wedding/our-wedding?to=Sok')
    assert.equal(res.status, 301)
    assert.match(res.headers.get('location') ?? '', /\/our-wedding\?to=Sok$/)
    assert.match((await call('/en/our-wedding?to=Sok')).headers.get('location') ?? '', /\/our-wedding\?to=Sok$/)
  })

  test('calendar files hold the whole schedule in the wedding timezone, per language', async () => {
    const km = await call('/api/public/weddings/our-wedding/events/all.ics')
    assert.equal(km.status, 200)
    assert.equal(km.text.match(/BEGIN:VEVENT/g)?.length, 12)
    assert.equal(new Set(km.text.match(/DTSTART:\S+/g)).size, 12)
    assert.match(km.text, /DTSTART:20270130T070000Z/)
    const en = await call('/api/public/weddings/our-wedding/events/all-en.ics')
    assert.match(en.text, /SUMMARY:Krong Pealy offering ceremony/)
    assert.equal((await call('/api/public/weddings/our-wedding/events/other.ics')).status, 404)
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

describe('guests', () => {
  test('creates a guest with validation', async () => {
    const bad = await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: '', side: 'both', group: '', maxAttendees: 0 } })
    assert.equal(bad.status, 400)
    const badSpouse = await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'X', side: 'both', group: '', maxAttendees: 1, spouse: 'cousin' } })
    assert.equal(badSpouse.status, 400)
    const res = await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'Test Household', side: 'groom', group: 'Friends', maxAttendees: 2, spouse: 'wife' } })
    assert.equal(res.status, 200)
    assert.equal(res.json.spouse, 'wife')
    guestId = res.json.id
  })

  test('a partial edit keeps the fields it did not send', async () => {
    const g = (await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'Partial', side: 'both', group: 'Family', maxAttendees: 1, phone: '012 345 678', notes: 'Keep me' } })).json
    const res = await call(`${api}/guests/${g.id}`, { method: 'PATCH', auth: true, body: { name: 'Partial Renamed' } })
    assert.equal(res.json.name, 'Partial Renamed')
    assert.equal(res.json.phone, '012 345 678')
    assert.equal(res.json.notes, 'Keep me')
    const w = (await call(api, { auth: true })).json
    await call(api, { method: 'PATCH', auth: true, body: { coverPosition: '40% 10%' } })
    await call(api, { method: 'PATCH', auth: true, body: { date: w.date } })
    assert.equal((await call(api, { auth: true })).json.coverPosition, '40% 10%')
  })

  test('guests can only be deleted once archived', async () => {
    assert.equal((await call(`${api}/guests/${guestId}`, { method: 'DELETE', auth: true })).status, 409)
    await call(`${api}/guests/bulk`, { method: 'POST', auth: true, body: { ids: [guestId], action: 'archive' } })
    assert.equal((await call(`${api}/guests/${guestId}`, { method: 'DELETE', auth: true })).status, 200)
  })
})

describe('wedding content', () => {
  test('moving the wedding date moves the schedule by the same amount', async () => {
    const w = (await call(api, { auth: true })).json
    const before = (await call(`${api}/events`, { auth: true })).json
    const dayLater = new Date(Date.parse(`${w.date}:00Z`) + 86_400_000).toISOString().slice(0, 16)
    assert.equal((await call(api, { method: 'PATCH', auth: true, body: { date: dayLater } })).status, 200)
    const after = (await call(`${api}/events`, { auth: true })).json
    assert.equal(after[0].start, new Date(Date.parse(`${before[0].start}:00Z`) + 86_400_000).toISOString().slice(0, 16))
    const moved = (await call(api, { auth: true })).json
    assert.equal(moved.rsvp.deadline, new Date(Date.parse(`${w.rsvp.deadline}:00Z`) + 86_400_000).toISOString().slice(0, 16))
    // A date-only save leaves everything else as it was
    assert.deepEqual({ ...moved, date: w.date, rsvp: w.rsvp, updatedAt: w.updatedAt, isSample: w.isSample }, w)
    await call(api, { method: 'PATCH', auth: true, body: { date: w.date } })
    assert.deepEqual((await call(`${api}/events`, { auth: true })).json.map((e: { start: string }) => e.start), before.map((e: { start: string }) => e.start))
  })

  test('the RSVP form link is saved and published; deadlines show as passed', async () => {
    const w = (await call(api, { auth: true })).json
    assert.equal((await call(api, { method: 'PATCH', auth: true, body: { rsvp: { ...w.rsvp, formUrl: 'javascript:alert(1)' } } })).status, 400)
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: { deadline: '2020-01-01T00:00', formUrl: 'https://forms.gle/abc' } } })
    const pub = (await call('/api/public/weddings/our-wedding')).json
    assert.equal(pub.wedding.rsvp.formUrl, 'https://forms.gle/abc')
    assert.equal(pub.deadlinePassed, true)
    await call(api, { method: 'PATCH', auth: true, body: { rsvp: w.rsvp } })
  })
})

describe('exports and isolation', () => {
  test('CSV export is UTF-8 with BOM, neutralises formulas and includes personal links', async () => {
    await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: '=HYPERLINK("http://x")', side: 'both', group: 'គ្រួសារ', maxAttendees: 1 } })
    await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'Mr Couple', side: 'both', group: '', maxAttendees: 2, spouse: 'wife' } })
    const csv = await call(`${api}/guests/export.csv`, { auth: true })
    // fetch's text() drops the BOM, so check the raw bytes
    const raw = Buffer.from(await (await fetch(`${BASE}${api}/guests/export.csv`, { headers: { cookie } })).arrayBuffer())
    assert.equal(raw.subarray(0, 3).toString('hex'), 'efbbbf')
    assert.ok(csv.text.startsWith('name,'))
    assert.match(csv.text, /"'=HYPERLINK\(""http:\/\/x""\)"/)
    assert.match(csv.text, /គ្រួសារ/)
    assert.match(csv.text, /\.app\/our-wedding\/\?to=Partial%20Renamed/)
    assert.match(csv.text, /,wife,.*\?to=Mr%20Couple&with=wife/)
  })

  test('records from one wedding cannot be edited through another', async () => {
    const g = (await call(`${api}/guests`, { method: 'POST', auth: true, body: { name: 'Mine', side: 'both', group: '', maxAttendees: 1 } })).json
    const other = await call('/api/admin/weddings', { method: 'POST', auth: true, body: { slug: 'second-wedding' } })
    assert.equal(other.status, 200)
    const res = await call(`/api/admin/weddings/${other.json.id}/guests/${g.id}`, { method: 'PATCH', auth: true, body: { name: 'Hijack' } })
    assert.equal(res.status, 404)
  })

  test('gallery upload checks the real file type and stores a plain file', async () => {
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
    assert.match(ok.json.url, /^\/uploads\//)
    const file = join(uploadsDir, ok.json.url.slice('/uploads/'.length))
    assert.ok(existsSync(file))
    assert.equal((await call(`${api}/gallery/${ok.json.id}`, { method: 'DELETE', auth: true })).status, 200)
    assert.ok(!existsSync(file))
  })

  test('music upload checks the real file type and replaces the earlier upload', async () => {
    const mp3 = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(64)])
    const form = (data: Blob) => {
      const f = new FormData()
      f.append('music', data, 'song.mp3')
      return f
    }
    const fake = await call(`${api}/music`, { method: 'POST', auth: true, raw: form(new Blob(['<script>'], { type: 'audio/mpeg' })) })
    assert.equal(fake.status, 400)
    const first = await call(`${api}/music`, { method: 'POST', auth: true, raw: form(new Blob([mp3], { type: 'audio/mpeg' })) })
    assert.equal(first.status, 200)
    assert.match(first.json.musicUrl, /^\/uploads\/.+\.mp3$/)
    const firstFile = join(uploadsDir, first.json.musicUrl.slice('/uploads/'.length))
    assert.ok(existsSync(firstFile))
    const second = await call(`${api}/music`, { method: 'POST', auth: true, raw: form(new Blob([mp3], { type: 'audio/mpeg' })) })
    assert.equal(second.status, 200)
    assert.ok(!existsSync(firstFile))
    assert.ok(existsSync(join(uploadsDir, second.json.musicUrl.slice('/uploads/'.length))))
  })

  test('share image must be a JPEG with a valid crop point, and replaces the earlier one', async () => {
    const jpeg = Buffer.concat([Buffer.from('ffd8ffe0', 'hex'), Buffer.alloc(64)])
    const form = (data: Blob, position = '50% 20%') => {
      const f = new FormData()
      f.append('image', data, 'share.jpg')
      f.append('cover', '/uploads/cover.webp')
      f.append('position', position)
      return f
    }
    assert.equal((await call(`${api}/share-image`, { method: 'POST', auth: true, raw: form(new Blob(['<script>'])) })).status, 400)
    assert.equal((await call(`${api}/share-image`, { method: 'POST', auth: true, raw: form(new Blob([jpeg]), 'top') })).status, 400)
    const first = await call(`${api}/share-image`, { method: 'POST', auth: true, raw: form(new Blob([jpeg])) })
    assert.equal(first.status, 200)
    assert.deepEqual({ ...first.json.shareImage, url: undefined }, { url: undefined, cover: '/uploads/cover.webp', position: '50% 20%' })
    const firstFile = join(uploadsDir, first.json.shareImage.url.slice('/uploads/'.length))
    assert.ok(existsSync(firstFile))
    const second = await call(`${api}/share-image`, { method: 'POST', auth: true, raw: form(new Blob([jpeg])) })
    assert.equal(second.status, 200)
    assert.ok(!existsSync(firstFile))
  })

  test('sign out ends the session', async () => {
    await call('/api/auth/session', { method: 'DELETE', auth: true })
    const res = await call('/api/admin/weddings', { headers: { cookie: '' } })
    assert.equal(res.status, 401)
  })
})
