import { z } from 'zod'

// Exchanges a Firebase ID token (from the login page) for an httpOnly session cookie.
export default defineEventHandler(async (event) => {
  rateLimit(event, 'login', 10, 15 * 60_000)
  if (useDriver() !== 'firebase') throw createError({ statusCode: 404 })
  const { idToken } = await readBody$(event, z.object({ idToken: z.string().max(5000) }))
  const auth = useFirebaseAuth()
  let uid: string
  try {
    const decoded = await auth.verifyIdToken(idToken, true)
    // Only accept a fresh sign-in, so a stolen old token can't mint a session
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60) throw new Error('stale')
    uid = decoded.uid
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Sign-in failed' })
  }
  const admin = await useDb().get<Admin>('admins', uid)
  if (!admin) throw createError({ statusCode: 403, statusMessage: 'This account is not an administrator' })

  const cookie = await auth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_S * 1000 })
  setCookie(event, ADMIN_COOKIE, cookie, {
    httpOnly: true, secure: !import.meta.dev, sameSite: 'strict', path: '/', maxAge: SESSION_MAX_AGE_S,
  })
  return { ok: true }
})
