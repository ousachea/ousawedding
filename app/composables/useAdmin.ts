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

/**
 * Uploads photos: each is resized in the browser (a 2000px image and a 640px thumbnail) and stored as a gallery item.
 * `visible: false` keeps them out of the public gallery (e.g. a cover photo uploaded from Assets).
 */
export function useImageUpload() {
  const { t } = useI18n()
  const { base } = useCurrentWedding()
  const api = useAdminApi()
  const { push } = useToasts()
  const progress = ref<{ n: number, total: number } | null>(null)

  async function resize(file: File, maxSide: number): Promise<{ blob: Blob, width: number, height: number }> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const encode = (type: string, quality: number) => new Promise<Blob | null>(r => canvas.toBlob(r, type, quality))
    // Browsers without WebP encoding return PNG; use JPEG instead to keep files small
    let blob = await encode('image/webp', 0.82)
    if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg', 0.85)
    if (!blob) throw new Error('encode failed')
    return { blob, width, height }
  }

  /** Uploads the image files picked in an <input type="file">, then clears it. Returns how many succeeded. */
  async function upload(event: Event, opts: { visible?: boolean } = {}) {
    const input = event.target as HTMLInputElement
    const files = [...(input.files ?? [])].filter(f => f.type.startsWith('image/'))
    input.value = ''
    if (!files.length) return 0
    progress.value = { n: 0, total: files.length }
    let ok = 0
    for (const file of files) {
      progress.value.n++
      try {
        const [full, thumb] = await Promise.all([resize(file, 2000), resize(file, 640)])
        const form = new FormData()
        form.append('image', full.blob, 'image')
        form.append('thumb', thumb.blob, 'thumb')
        form.append('width', String(full.width))
        form.append('height', String(full.height))
        if (opts.visible === false) form.append('visible', 'false')
        await api(`${base.value}/gallery`, { method: 'POST', body: form })
        ok++
      } catch {
        push(`${file.name}: ${t('common.error')}`, 'error')
      }
    }
    progress.value = null
    if (ok) push(`${t('common.saved')} (${ok})`)
    return ok
  }

  return { progress, upload }
}
