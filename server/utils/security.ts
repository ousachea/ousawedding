import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'

function secret(name: 'inviteSecret' | 'sessionSecret'): string {
  const value = useRuntimeConfig()[name]
  if (value && value.length >= 32) return value
  if (import.meta.dev || process.env.ALLOW_LOCAL_DRIVER === 'true') return `dev-only-${name}-not-for-production-use`
  throw new Error(`NUXT_${name === 'inviteSecret' ? 'INVITE' : 'SESSION'}_SECRET must be at least 32 characters`)
}

export const sessionSecret = () => secret('sessionSecret')

export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url')
}

export function hashInviteToken(token: string): string {
  return createHmac('sha256', secret('inviteSecret')).update(token).digest('hex')
}

const encKey = () => createHash('sha256').update(`${secret('inviteSecret')}:encrypt`).digest()

export function encryptToken(token: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encKey(), iv)
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), data].map(b => b.toString('base64url')).join('.')
}

export function decryptToken(value: string): string | null {
  try {
    const [iv, tag, data] = value.split('.').map(p => Buffer.from(p, 'base64url'))
    const decipher = createDecipheriv('aes-256-gcm', encKey(), iv!)
    decipher.setAuthTag(tag!)
    return Buffer.concat([decipher.update(data!), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}

// shortcut: per-instance memory, so limits are approximate on serverless; move to Redis/KV if abused
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
