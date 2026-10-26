export default defineEventHandler(async (event) => {
  const admin = await getAdmin(event)
  if (!admin) throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  return admin
})
