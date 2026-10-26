export default defineEventHandler(async (event) => {
  const { wedding, admin } = await requireWedding(event, 'owner')
  const uid = getRouterParam(event, 'uid')!
  if (uid === admin.id) throw createError({ statusCode: 400, statusMessage: 'You cannot remove yourself' })
  const target = await useDb().get<Admin>('admins', uid)
  if (!target) throw createError({ statusCode: 404 })
  if (target.weddingIds.includes('*')) throw createError({ statusCode: 400, statusMessage: 'All-access admins are managed in Firestore' })
  await useDb().update('admins', uid, { weddingIds: target.weddingIds.filter(id => id !== wedding.id) })
  return { ok: true }
})
