// Cookie-authenticated writes must come from this site. SameSite=strict cookies already block most
// cross-site requests; checking Origin covers older browsers.
export default defineEventHandler((event) => {
  const path = event.path
  if (!path.startsWith('/api/admin') && !path.startsWith('/api/auth')) return
  if (['GET', 'HEAD', 'OPTIONS'].includes(event.method)) return
  const origin = getRequestHeader(event, 'origin')
  if (origin && new URL(origin).host !== getRequestHost(event, { xForwardedHost: true })) {
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request blocked' })
  }
})
