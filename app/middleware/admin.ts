// Client-side guard for admin pages. The server checks every admin API call independently.
export default defineNuxtRouteMiddleware(async () => {
  const { me, load } = useAdminSession()
  if (!me.value && !(await load())) {
    return navigateTo(useLocalePath()('/admin/login'))
  }
})
