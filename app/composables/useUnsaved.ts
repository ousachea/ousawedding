/**
 * Tracks whether an editable copy differs from what was last loaded or saved, and asks before leaving the
 * page (or closing the tab) with changes not saved. Call `reset()` after loading or saving.
 */
export function useUnsaved(draft: Ref<unknown>) {
  const { t } = useI18n()
  const { confirm } = useConfirm()
  const saved = ref('')
  const reset = () => (saved.value = JSON.stringify(draft.value))
  const dirty = computed(() => !!saved.value && JSON.stringify(draft.value) !== saved.value)

  onBeforeRouteLeave(async () => {
    if (dirty.value && !await confirm(t('admin.stepNav.leave'), { action: t('admin.stepNav.leaveAction') })) return false
  })
  const warn = (e: BeforeUnloadEvent) => { if (dirty.value) e.preventDefault() }
  onMounted(() => addEventListener('beforeunload', warn))
  onBeforeUnmount(() => removeEventListener('beforeunload', warn))
  return { dirty, reset }
}
