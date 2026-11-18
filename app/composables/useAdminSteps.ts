// The admin is a set of steps done in order; labels are admin.steps.<key>.title / .hint
export const ADMIN_STEPS = [
  { key: 'couple', to: '/admin/couple' },
  { key: 'schedule', to: '/admin/events' },
  { key: 'photos', to: '/admin/gallery' },
  { key: 'words', to: '/admin/words' },
  { key: 'look', to: '/admin/theme' },
  { key: 'replies', to: '/admin/replies' },
  { key: 'share', to: '/admin/share' },
] as const

export function useAdminSteps() {
  const route = useRoute()
  const localePath = useLocalePath()
  const index = computed(() => ADMIN_STEPS.findIndex(s => localePath(s.to) === route.path.replace(/\/$/, '')))
  const step = computed(() => ADMIN_STEPS[index.value] ?? null)
  const prev = computed(() => (index.value > 0 ? ADMIN_STEPS[index.value - 1]! : null))
  const next = computed(() => (index.value >= 0 ? ADMIN_STEPS[index.value + 1] ?? null : null))
  // For forms whose "Save and continue" button is named "next": go on once saved
  const continueIf = (e?: Event) => {
    if ((e as SubmitEvent | undefined)?.submitter?.getAttribute('name') === 'next' && next.value) return navigateTo(localePath(next.value.to))
  }
  return { steps: ADMIN_STEPS, index, step, prev, next, continueIf }
}
