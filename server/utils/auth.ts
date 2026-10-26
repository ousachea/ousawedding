import type { H3Event } from 'h3'
import { getAuth } from 'firebase-admin/auth'

export const ADMIN_COOKIE = 'wedding_admin'
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 5

const LOCAL_ADMIN: Admin = { id: 'local-admin', email: 'admin@localhost', name: 'Local admin', role: 'owner', weddingIds: ['*'] }

export const useFirebaseAuth = () => getAuth(useFirebaseApp())

function localSession(event: H3Event) {
  return useSession<{ uid?: string }>(event, { name: `${ADMIN_COOKIE}_local`, password: sessionSecret(), maxAge: SESSION_MAX_AGE_S, cookie: { sameSite: 'strict' } })
}

export async function startLocalSession(event: H3Event) {
  await (await localSession(event)).update({ uid: LOCAL_ADMIN.id })
}

export async function endSession(event: H3Event) {
  if (useDriver() === 'local') await (await localSession(event)).clear()
  deleteCookie(event, ADMIN_COOKIE, { path: '/' })
}

/** Returns the signed-in admin, or null. Admin rights come only from the `admins` collection. */
export async function getAdmin(event: H3Event): Promise<Admin | null> {
  if (event.context.admin !== undefined) return event.context.admin
  let admin: Admin | null = null
  if (useDriver() === 'local') {
    const session = await localSession(event)
    admin = session.data.uid === LOCAL_ADMIN.id ? LOCAL_ADMIN : null
  } else {
    const cookie = getCookie(event, ADMIN_COOKIE)
    if (cookie) {
      try {
        const decoded = await useFirebaseAuth().verifySessionCookie(cookie, true)
        admin = await useDb().get<Admin>('admins', decoded.uid)
      } catch {
        admin = null
      }
    }
  }
  event.context.admin = admin
  return admin
}

export async function requireAdmin(event: H3Event): Promise<Admin> {
  const admin = await getAdmin(event)
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return admin
}

export function canAccessWedding(admin: Admin, weddingId: string) {
  return admin.weddingIds.includes('*') || admin.weddingIds.includes(weddingId)
}

/** Loads the wedding named by the `id` route param after checking the admin may manage it. */
export async function requireWedding(event: H3Event, role?: AdminRole): Promise<{ admin: Admin, wedding: Wedding }> {
  const admin = await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  if (!canAccessWedding(admin, id) || (role === 'owner' && admin.role !== 'owner')) {
    throw createError({ statusCode: 403, statusMessage: 'Not allowed' })
  }
  const wedding = await useDb().get<Wedding>('weddings', id)
  if (!wedding) throw createError({ statusCode: 404, statusMessage: 'Wedding not found' })
  return { admin, wedding }
}

/** Loads a child document and confirms it belongs to the wedding, so IDs from another wedding are rejected. */
export async function requireChild<T extends { weddingId: string }>(col: Collection, id: string, weddingId: string): Promise<T> {
  const doc = await useDb().get<T>(col, id)
  if (!doc || doc.weddingId !== weddingId) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return doc
}

declare module 'h3' {
  interface H3EventContext {
    admin?: Admin | null
  }
}
