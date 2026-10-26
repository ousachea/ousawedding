import type { FetchError } from 'ofetch'

type Toast = { id: number, message: string, kind: 'success' | 'error' }

export function useToasts() {
  const toasts = useState<Toast[]>('admin-toasts', () => [])
  function push(message: string, kind: Toast['kind'] = 'success') {
    const id = Date.now() + Math.random()
    toasts.value.push({ id, message, kind })
    setTimeout(() => (toasts.value = toasts.value.filter(t => t.id !== id)), kind === 'error' ? 7000 : 3500)
  }
  return { toasts, push }
}

type ConfirmState = { message: string, action: string, danger: boolean, resolve: (ok: boolean) => void } | null

/** Promise-based confirmation dialog, rendered once by the admin layout. */
export function useConfirm() {
  const state = useState<ConfirmState>('admin-confirm', () => null)
  const confirm = (message: string, opts: { action?: string, danger?: boolean } = {}) =>
    new Promise<boolean>((resolve) => {
      state.value = { message, action: opts.action ?? '', danger: opts.danger ?? true, resolve }
    })
  return { state, confirm }
}

export function errorMessage(e: unknown, fallback: string) {
  const err = e as FetchError
  const issues = err?.data?.data?.issues as Array<{ path: string, message: string }> | undefined
  if (issues?.length) return issues.map(i => `${i.path}: ${i.message}`).join(' · ')
  return err?.data?.statusMessage || err?.statusMessage || fallback
}

/** $fetch for admin endpoints: shows an error toast and rethrows, so callers only handle success. */
export function useAdminApi() {
  const { push } = useToasts()
  const { t } = useI18n()
  const localePath = useLocalePath()
  return async function api<T>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
    try {
      return await $fetch<T>(url, opts as never) as T
    } catch (e) {
      if ((e as FetchError).statusCode === 401) {
        await navigateTo(localePath('/admin/login'))
      } else {
        push(errorMessage(e, t('common.error')), 'error')
      }
      throw e
    }
  }
}

export function useAdminSession() {
  const me = useState<Admin | null>('admin-me', () => null)
  async function load() {
    try {
      me.value = await $fetch<Admin>('/api/auth/me')
    } catch {
      me.value = null
    }
    return me.value
  }
  return { me, load }
}

type WeddingSummary = Pick<Wedding, 'id' | 'slug' | 'names' | 'date' | 'published'>

/** The wedding the dashboard is managing, remembered per browser. */
export function useCurrentWedding() {
  const list = useState<WeddingSummary[]>('admin-weddings', () => [])
  const id = useState<string>('admin-wedding-id', () => '')
  const wedding = useState<Wedding | null>('admin-wedding', () => null)
  const api = useAdminApi()

  async function loadList() {
    list.value = await api<WeddingSummary[]>('/api/admin/weddings')
    let saved = ''
    try { saved = localStorage.getItem('admin-wedding-id') ?? '' } catch {}
    id.value = list.value.find(w => w.id === saved)?.id ?? list.value[0]?.id ?? ''
    await loadWedding()
  }

  async function loadWedding() {
    wedding.value = id.value ? await api<Wedding>(`/api/admin/weddings/${id.value}`) : null
  }

  async function select(next: string) {
    id.value = next
    try { localStorage.setItem('admin-wedding-id', next) } catch {}
    await loadWedding()
  }

  const base = computed(() => `/api/admin/weddings/${id.value}`)
  return { list, id, wedding, base, loadList, loadWedding, select }
}
