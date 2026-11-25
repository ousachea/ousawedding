import { test } from 'node:test'
import assert from 'node:assert/strict'
import { richText, plainText } from '../shared/utils/richText.ts'
import { slugify } from '../shared/utils/slug.ts'

test('formatting is kept, and editor tags are tidied', () => {
  assert.equal(richText('<div><b>Hi</b> <i class="x">you</i></div><ul><li>a</li></ul>'), '<p><strong>Hi</strong> <em>you</em></p><ul><li>a</li></ul>')
  assert.equal(richText('<a href="https://x.com/?a=1&amp;b=2" onclick="x()">go</a>'), '<a href="https://x.com/?a=1&amp;b=2" target="_blank" rel="noopener">go</a>')
  // Descriptions from before the editor are plain text
  assert.equal(richText('Ousa & Kanha, 5 < 6'), 'Ousa &amp; Kanha, 5 &lt; 6')
  assert.equal(richText('<p><br></p>'), '')
  assert.equal(richText('Hi <b>you</b><p><ul><li>a</li></ul></p>'), 'Hi <strong>you</strong><ul><li>a</li></ul>')
})

test('nothing that can run survives', () => {
  for (const bad of [
    '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<p onclick="alert(1)">x</p>', '<svg/onload=alert(1)>',
    '<a href="javascript:alert(1)">x</a>', '<a href=" java\nscript:alert(1)">x</a>', '<a href="https://x" style="x" onmouseover="alert(1)">x</a>',
    '<a href=\'https://x" onmouseover="alert(1)\'>x</a>', '<<b>script>alert(1)</b>', '<b <img src=x onerror=alert(1)>', '<iframe src="//x">', '<p/onclick=alert(1)>x',
    '<constructor>x', '<a href="https://x&quot; onmouseover=&quot;alert(1)">x</a>',
  ]) {
    const out = richText(bad)
    assert.match(out.replace(/<\/?(strong|em|u|ul|ol|li|p|br)>|<a href="[^"<>]*" target="_blank" rel="noopener">|<\/a>/g, ''), /^[^<>]*$/, `${bad} → ${out}`)
    assert.doesNotMatch(out, /href="(?!https?:|mailto:|tel:)/i, `${bad} → ${out}`)
  }
})

test('tags always balance, so they cannot break the page around them', () => {
  assert.equal(richText('</p><b><i>x</b>'), '<strong><em>x</em></strong>')
})

test('plain words for calendar files', () => {
  assert.equal(plainText('<p>One &amp; two</p><ul><li>a</li><li>b</li></ul>'), 'One & two\n• a\n• b')
  assert.equal(plainText('Line one\nline two'), 'Line one\nline two')
})

test('web addresses from any text', () => {
  assert.equal(slugify('  Ousa & Kanha! '), 'ousa-kanha')
  assert.equal(slugify('José'), 'jose')
})
