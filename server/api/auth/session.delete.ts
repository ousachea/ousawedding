export default defineEventHandler(async (event) => {
  const admin = await getAdmin(event)
  if (admin && useDriver() === 'firebase') {
    // Signs the admin out on every device
    await useFirebaseAuth().revokeRefreshTokens(admin.id).catch(() => {})
  }
  await endSession(event)
  return { ok: true }
})
