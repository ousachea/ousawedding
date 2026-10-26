// Grants an existing Firebase Auth user access to this wedding. Owners only.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event, 'owner')
  if (useDriver() === 'local') throw createError({ statusCode: 400, statusMessage: 'Not available with the local driver' })
  const { email, role } = await readBody$(event, adminInviteSchema)
  const user = await useFirebaseAuth().getUserByEmail(email).catch(() => null)
  if (!user) throw createError({ statusCode: 404, statusMessage: 'Create this user in Firebase Authentication first' })
  const existing = await useDb().get<Admin>('admins', user.uid)
  const admin: Admin = {
    id: user.uid, email, name: user.displayName ?? existing?.name ?? '', role,
    weddingIds: existing?.weddingIds.includes('*') ? ['*'] : [...new Set([...(existing?.weddingIds ?? []), wedding.id])],
  }
  await useDb().set('admins', admin.id, admin)
  return admin
})
