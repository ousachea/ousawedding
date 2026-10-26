import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

// Password sign-in for the local development driver only.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'login', 10, 15 * 60_000)
  if (useDriver() !== 'local') throw createError({ statusCode: 404 })
  const expected = useRuntimeConfig().localAdminPassword
  const { password } = await readBody$(event, z.object({ password: z.string().max(200) }))
  const a = Buffer.from(password)
  const b = Buffer.from(expected)
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw createError({ statusCode: 401, statusMessage: 'Wrong password' })
  }
  await startLocalSession(event)
  return { ok: true }
})
