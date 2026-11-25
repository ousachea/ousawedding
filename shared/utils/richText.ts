// Formatted text from the admin's editor. Everything is rebuilt from a short list of tags, without their
// attributes; whatever else is in there comes out as plain text, so it can never carry a script.
const TAGS: Record<string, string> = { b: 'strong', strong: 'strong', i: 'em', em: 'em', u: 'u', ul: 'ul', ol: 'ol', li: 'li', p: 'p', div: 'p', br: 'br', a: 'a' }
const escapeText = (s: string) => s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&')

export function richText(html: string): string {
  const open: string[] = []
  let out = ''
  for (const part of html.split(/(<\/?[a-zA-Z][^<>]*>)/)) {
    const tag = /^<(\/?)([a-zA-Z]+[0-9]*)([^]*)>$/.exec(part)
    if (!tag) { out += escapeText(part); continue }
    const name = Object.hasOwn(TAGS, tag[2]!.toLowerCase()) ? TAGS[tag[2]!.toLowerCase()]! : ''
    if (!name) continue
    if (name === 'br') out += '<br>'
    else if (tag[1]) {
      // Closes whatever was left open inside it; a close with no opening is dropped
      if (!open.includes(name)) continue
      let top
      do { top = open.pop()!; out += `</${top}>` } while (top !== name)
    }
    else if (name === 'a') {
      const href = decode(/\shref\s*=\s*["']([^"']*)["']/i.exec(tag[3]!)?.[1] ?? '').trim()
      if (!/^(https?:\/\/|mailto:|tel:)/i.test(href)) continue
      out += `<a href="${escapeText(href)}" target="_blank" rel="noopener">`
      open.push('a')
    }
    else {
      // Paragraphs hold no lists or paragraphs (browsers' editors nest them all the same)
      if (['p', 'ul', 'ol'].includes(name)) while (open.includes('p')) out += `</${open.pop()}>`
      out += `<${name}>`
      open.push(name)
    }
  }
  while (open.length) out += `</${open.pop()}>`
  // An emptied editor leaves tags with nothing in them
  return plainText(out) ? out.replace(/<p>(<br>)?<\/p>/g, '').trim() : ''
}

/** The words alone, e.g. for calendar files */
export const plainText = (html: string) => decode(
  html.replace(/<li>/g, '• ').replace(/<br>|<\/(p|li)>/g, '\n').replace(/<\/?[a-zA-Z][^<>]*>/g, ''),
).replace(/\n{2,}/g, '\n').trim()
