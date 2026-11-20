import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addGuestToTitles, personalLink, setShareUrl, withGuestName } from '../shared/guest-preview.ts'
import { inviteLink, parseSpouse, withSpouse } from '../shared/utils/wedding.ts'

const page = (lang: string) => `<html lang="${lang}"><head><title>Ousa &amp; Kanha</title><meta property="og:title" content="Ousa & Kanha"><meta name="twitter:title" content="Ousa & Kanha"><meta property="og:description" content="x"></head></html>`

test('the guest name leads the title, og:title and twitter:title, in the page language', () => {
  const km = addGuestToTitles(page('km'), ' Chea Phalla ')
  assert.match(km, /<title>សូមគោរពជូន Chea Phalla \| Ousa &amp; Kanha<\/title>/)
  assert.match(km, /og:title" content="សូមគោរពជូន Chea Phalla \| Ousa & Kanha"/)
  assert.match(km, /twitter:title" content="សូមគោរពជូន Chea Phalla \| /)
  assert.match(km, /og:description" content="x"/)
  assert.match(addGuestToTitles(page('en'), 'Kieran Glover'), /<title>Specially for Kieran Glover \| /)
})

test('names cannot break out of the tags, and empty names change nothing', () => {
  const out = addGuestToTitles(page('en'), '"><script>alert(1)</script>')
  assert.ok(!out.includes('<script>'))
  assert.match(out, /content="Specially for &quot;&gt;&lt;script&gt;/)
  assert.equal(addGuestToTitles(page('en'), '   '), page('en'))
})

test('only successful HTML responses are rewritten', async () => {
  const html = await withGuestName(new Response(page('en'), { headers: { 'content-type': 'text/html; charset=utf-8', 'content-length': '1' } }), 'A')
  assert.match(await html.text(), /Specially for A/)
  assert.equal(html.headers.get('content-length'), null)
  const css = new Response('body{}', { headers: { 'content-type': 'text/css' } })
  assert.equal(await withGuestName(css, 'A'), css)
})

test('a spouse joins the name in the page language, on the letter and in link previews', () => {
  assert.equal(withSpouse('Sok Dara', 'wife', 'en'), 'Sok Dara and wife')
  assert.equal(withSpouse('Sok Dara', 'husband', 'km'), 'Sok Dara និងស្វាមី')
  assert.equal(withSpouse('Sok Dara', '', 'en'), 'Sok Dara')
  assert.match(addGuestToTitles(page('km'), 'Chea Phalla', 'wife'), /<title>សូមគោរពជូន Chea Phalla និងភរិយា \| /)
  assert.match(addGuestToTitles(page('en'), 'Chea Phalla', 'husband'), /<title>Specially for Chea Phalla and husband \| /)
})

test('personal links carry the spouse, and only wife or husband is read back', () => {
  assert.equal(inviteLink({ slug: 'w' }, 'Sok Dara', 'https://x.app/', 'en', 'wife'), 'https://x.app/w/?to=Sok%20Dara&with=wife')
  assert.equal(inviteLink({ slug: 'w' }, 'Sok', 'https://x.app', 'km'), 'https://x.app/km/w/?to=Sok')
  assert.equal(parseSpouse('husband'), 'husband')
  assert.equal(parseSpouse('<script>'), '')
  assert.equal(parseSpouse(['wife']), '')
})

test('a personal link previews as itself, so Facebook keeps the guest’s name', async () => {
  const og = '<html lang="en"><head><title>A</title><meta property="og:title" content="A"><meta property="og:url" content="https://site.app/ousa-kanha/"></head></html>'
  const link = personalLink(new URL('https://site.app/ousa-kanha?to=MrChea&with=wife&fbclid=xyz'))
  assert.equal(link, 'https://site.app/ousa-kanha/?to=MrChea&with=wife')
  assert.equal(personalLink(new URL('https://site.app/km/ousa-kanha/?to=%E1%9E%9F%E1%9E%BB%E1%9E%81')), 'https://site.app/km/ousa-kanha/?to=%E1%9E%9F%E1%9E%BB%E1%9E%81')
  assert.match(setShareUrl(og, link), /og:url" content="https:\/\/site.app\/ousa-kanha\/\?to=MrChea&amp;with=wife"/)
  const res = await withGuestName(new Response(og, { headers: { 'content-type': 'text/html' } }), 'MrChea', '', link)
  assert.match(await res.text(), /og:url" content="https:\/\/site.app\/ousa-kanha\/\?to=MrChea&amp;with=wife"/)
})
