import type { H3Event } from 'h3'

export const ADMIN_COOKIE = 'wedding_admin'
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 5

// The admin runs only on your computer, signed in with NUXT_LOCAL_ADMIN_PASSWORD
const LOCAL_ADMIN: Admin = { id: 'local-admin', email: 'admin@localhost', name: 'Local admin', role: 'owner', weddingIds: ['*'] }

function localSession(event: H3Event) {
  return useSession<{ uid?: string }>(event, { name: `${ADMIN_COOKIE}_local`, password: sessionSecret(), maxAge: SESSION_MAX_AGE_S, cookie: { sameSite: 'strict', secure: !import.meta.dev } })
}

export async function startLocalSession(event: H3Event) {
  await (await localSession(event)).update({ uid: LOCAL_ADMIN.id })
}

export async function endSession(event: H3Event) {
  await (await localSession(event)).clear()
}

/** Returns the signed-in admin, or null. */
export async function getAdmin(event: H3Event): Promise<Admin | null> {
  if (event.context.admin !== undefined) return event.context.admin
  const session = await localSession(event)
  event.context.admin = session.data.uid === LOCAL_ADMIN.id ? LOCAL_ADMIN : null
  return event.context.admin
}

export async function requireAdmin(event: H3Event): Promise<Admin> {
  const admin = await getAdmin(event)
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return admin
}

/** Loads the wedding named by the `id` route param, for a signed-in admin. */
export async function requireWedding(event: H3Event): Promise<{ admin: Admin, wedding: Wedding }> {
  const admin = await requireAdmin(event)
  const wedding = await useDb().get<Wedding>('weddings', getRouterParam(event, 'id')!)
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
