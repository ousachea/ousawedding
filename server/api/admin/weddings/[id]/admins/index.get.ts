// Admins with access to this wedding. Firebase driver only; the local driver has one built-in admin.
export default defineEventHandler(async (event) => {
  const { wedding, admin } = await requireWedding(event)
  if (useDriver() === 'local') return [admin]
  const [scoped, all] = await Promise.all([
    useDb().where<Admin>('admins', 'role', 'owner'),
    useDb().where<Admin>('admins', 'role', 'editor'),
  ])
  return [...scoped, ...all].filter(a => canAccessWedding(a, wedding.id))
})
