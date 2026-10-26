<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, id, wedding, loadWedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

const images = ref<GalleryImage[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    images.value = await api<GalleryImage[]>(`${base.value}/gallery`)
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

// Resize in the browser: a 2000px full image and a 640px thumbnail
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

const progress = ref<{ n: number, total: number } | null>(null)
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])].filter(f => f.type.startsWith('image/'))
  input.value = ''
  if (!files.length) return
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
      await api(`${base.value}/gallery`, { method: 'POST', body: form })
      ok++
    } catch {
      push(`${file.name}: ${t('common.error')}`, 'error')
    }
  }
  progress.value = null
  if (ok) push(`${t('common.saved')} (${ok})`)
  await load()
}

async function patch(img: GalleryImage, body: Partial<Pick<GalleryImage, 'caption' | 'alt' | 'visible'>>) {
  Object.assign(img, await api<GalleryImage>(`${base.value}/gallery/${img.id}`, { method: 'PATCH', body }))
}
async function saveText(img: GalleryImage) {
  await patch(img, { caption: img.caption, alt: img.alt })
  push(t('common.saved'))
}
async function setCover(img: GalleryImage) {
  await api(base.value, { method: 'PATCH', body: { coverImage: img.url } })
  await loadWedding()
  push(t('common.saved'))
}
async function remove(img: GalleryImage) {
  if (!await confirm(t('admin.gallery.deleteConfirm'), { action: t('common.delete') })) return
  await api(`${base.value}/gallery/${img.id}`, { method: 'DELETE' })
  await Promise.all([load(), loadWedding()])
  push(t('common.saved'))
}
async function move(index: number, step: number) {
  const list = [...images.value]
  const [item] = list.splice(index, 1)
  list.splice(index + step, 0, item!)
  images.value = list
  await api(`${base.value}/gallery/reorder`, { method: 'POST', body: { ids: list.map(i => i.id) } }).catch(load)
}
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.gallery') }}</h1>
      <label class="btn btn-primary upload" :class="{ busy: progress }">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="visually-hidden" :disabled="!!progress" @change="upload">
        {{ progress ? t('admin.gallery.uploading', progress) : `+ ${t('admin.gallery.upload')}` }}
      </label>
    </div>
    <p class="muted small">{{ t('admin.gallery.hint') }}</p>

    <p v-if="loading && !images.length" class="muted">{{ t('common.loading') }}</p>
    <div v-else-if="!images.length" class="panel empty-state"><p>{{ t('admin.gallery.empty') }}</p></div>
    <ul v-else class="grid">
      <li v-for="(img, i) in images" :key="img.id" class="panel item" :class="{ hidden: !img.visible }">
        <div class="thumb">
          <img :src="img.thumbUrl || img.url" :alt="img.alt.en || img.caption.en" loading="lazy" :width="img.width" :height="img.height">
          <span v-if="wedding?.coverImage === img.url" class="badge responded cover">{{ t('admin.gallery.isCover') }}</span>
        </div>
        <form class="form-grid" @submit.prevent="saveText(img)">
          <AdminLocalizedField v-model="img.caption" :label="t('admin.gallery.caption')" />
          <AdminLocalizedField v-model="img.alt" :label="t('admin.gallery.alt')" />
          <div class="actions">
            <button type="submit" class="btn btn-outline btn-sm">{{ t('common.save') }}</button>
            <label class="check small"><input type="checkbox" :checked="img.visible" @change="patch(img, { visible: !img.visible })"> {{ t('admin.gallery.visible') }}</label>
          </div>
        </form>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" :aria-label="t('admin.gallery.moveUp')" @click="move(i, -1)">←</button>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="i === images.length - 1" :aria-label="t('admin.gallery.moveDown')" @click="move(i, 1)">→</button>
          <button v-if="wedding?.coverImage !== img.url" type="button" class="btn btn-ghost btn-sm" @click="setCover(img)">{{ t('admin.gallery.cover') }}</button>
          <button type="button" class="btn btn-danger btn-sm" @click="remove(img)">{{ t('common.delete') }}</button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.upload { cursor: pointer; }
.upload.busy { opacity: 0.7; cursor: progress; }
.upload:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 3px; }
.grid { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); }
.item { display: flex; flex-direction: column; gap: var(--space-3); padding: var(--space-3); }
.item.hidden .thumb img { opacity: 0.45; }
.thumb { position: relative; }
.thumb img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: var(--radius-sm); }
.cover { position: absolute; top: 8px; left: 8px; background: var(--c-surface); }
.actions { display: flex; align-items: center; gap: var(--space-3); }
.row-actions { display: flex; flex-wrap: wrap; gap: var(--space-1); justify-content: flex-end; }
</style>
