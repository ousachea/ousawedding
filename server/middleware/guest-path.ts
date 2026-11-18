// The short personal links (/ousa-kanha/CheaOusa) on the dev server; netlify.toml does the same on the live site
export default defineEventHandler(async (event) => {
  const m = event.path.match(/^(\/km)?\/([\w-]+)\/([^/?]+)\/?$/)
  if (!m || ['api', 'admin', 'uploads', '_nuxt', 'banks'].includes(m[2]!)) return
  if (!await findWeddingBySlug(m[2]!)) return
  return sendRedirect(event, `${m[1] ?? ''}/${m[2]}/?to=${encodeURIComponent(decodeURIComponent(m[3]!))}`, 301)
})
