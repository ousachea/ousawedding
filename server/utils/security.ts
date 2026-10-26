import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

// Signs the admin session cookie. The admin only runs on your computer, so a built-in value is fine
// unless NUXT_SESSION_SECRET is set.
function secret(): string {
  const value = useRuntimeConfig().sessionSecret
  return value && value.length >= 32 ? value : 'local-admin-session-secret-for-this-computer-only'
}

export const sessionSecret = () => secret()

const buckets = new Map<string, { count: number, reset: number }>()

export function rateLimit(event: H3Event, name: string, limit: number, windowMs: number) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const key = `${name}:${ip}`
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.reset < now) buckets.delete(k)
    return
  }
  if (++bucket.count > limit) {
    setResponseHeader(event, 'retry-after', Math.ceil((bucket.reset - now) / 1000))
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
}

export function newId(): string {
  return randomBytes(12).toString('base64url')
}
