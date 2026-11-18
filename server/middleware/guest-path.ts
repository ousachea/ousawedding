// The short personal links (/ousa-kanha/CheaOusa) on the dev server; public/_redirects does the same on the live site
export default defineEventHandler(async (event) => {
  const m = event.path.match(/^(\/km)?\/([\w-]+)\/([^/?]+)\/?$/)
  // Names starting with _ are Nuxt's own files (e.g. _payload.json, the page data)
  if (!m || m[3]!.startsWith('_') || ['api', 'admin', 'uploads', '_nuxt', 'banks'].includes(m[2]!)) return
  if (!await findWeddingBySlug(m[2]!)) return
  return sendRedirect(event, `${m[1] ?? ''}/${m[2]}/?to=${encodeURIComponent(decodeURIComponent(m[3]!))}`, 301)
})
