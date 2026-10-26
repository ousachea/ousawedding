<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t, locale } = useI18n()
const { base, id, wedding, loadWedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

const images = ref<GalleryImage[]>([])
const events = ref<WeddingEvent[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    ;[images.value, events.value] = await Promise.all([
      api<GalleryImage[]>(`${base.value}/gallery`),
      api<WeddingEvent[]>(`${base.value}/events`),
    ])
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

// Where each image is used: the cover (also the share preview), the public gallery, schedule items
const eventName = (e: WeddingEvent) => e.title[locale.value as Locale] || e.title.en
const usesOf = (url: string, img?: GalleryImage) => [
  ...(wedding.value?.coverImage === url ? [t('admin.assets.usedCover')] : []),
  ...(img?.visible ? [t('admin.assets.usedGallery')] : []),
  ...events.value.filter(e => e.imageUrl === url).map(e => t('admin.assets.usedEvent', { name: eventName(e) })),
]
// Images the cover or schedule link to that were never uploaded here (e.g. the sample cover)
const linked = computed(() => [wedding.value?.coverImage ?? '', ...events.value.map(e => e.imageUrl)]
  .filter((u, i, all) => u && all.indexOf(u) === i && !images.value.some(img => img.url === u)))
const filter = ref<'all' | 'used' | 'unused'>('all')
const matches = (f: typeof filter.value, img: GalleryImage) => f === 'all' || (f === 'used') === usesOf(img.url, img).length > 0
const shown = computed(() => images.value.filter(img => matches(filter.value, img)))
async function copy(url: string) {
  await navigator.clipboard.writeText(new URL(url, location.origin).href)
  push(t('admin.assets.copied'))
}

// Cover crop: click the photo to choose the point that stays in view (e.g. the faces)
async function setCoverPosition(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const pct = (v: number) => `${Math.round(Math.min(Math.max(v, 0), 1) * 1000) / 10}%`
  const position = `${pct((event.clientX - box.left) / box.width)} ${pct((event.clientY - box.top) / box.height)}`
  await api(base.value, { method: 'PATCH', body: { coverPosition: position } })
  await loadWedding()
  push(t('common.saved'))
}

const { progress, upload: uploadFiles } = useImageUpload()
async function upload(event: Event) {
  if (await uploadFiles(event)) await load()
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
  const uses = usesOf(img.url, img)
  const message = uses.length ? t('admin.assets.deleteConfirm', { places: uses.join(', ') }) : t('admin.assets.deleteConfirmUnused')
  if (!await confirm(message, { action: t('common.delete') })) return
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

    <div class="toolbar" role="group">
      <button v-for="f in (['all', 'used', 'unused'] as const)" :key="f" type="button" class="btn btn-sm" :class="filter === f ? 'btn-primary' : 'btn-ghost'" :aria-pressed="filter === f" @click="filter = f">
        {{ t(`admin.assets.filter${f[0]!.toUpperCase()}${f.slice(1)}`) }} ({{ images.filter(img => matches(f, img)).length }})
      </button>
    </div>

    <p v-if="loading && !images.length" class="muted">{{ t('common.loading') }}</p>
    <div v-else-if="!shown.length" class="panel empty-state"><p>{{ t('admin.gallery.empty') }}</p></div>
    <ul v-else class="grid">
      <li v-for="(img, i) in shown" :key="img.id" class="panel item" :class="{ hidden: !img.visible }">
        <!-- The cover is shown cropped like on the invitation; clicking sets the point that stays in view -->
        <button
          v-if="wedding?.coverImage === img.url"
          type="button" class="thumb cover-crop" :title="t('admin.gallery.coverPositionHint')" @click="setCoverPosition"
        >
          <img :src="img.url" alt="" :style="{ objectPosition: wedding.coverPosition }">
          <span class="focus" :style="{ left: (wedding.coverPosition ?? '50% 50%').split(' ')[0], top: (wedding.coverPosition ?? '50% 50%').split(' ')[1] }" aria-hidden="true" />
        </button>
        <div v-else class="thumb">
          <img :src="img.thumbUrl || img.url" :alt="img.alt.en || img.caption.en" loading="lazy" :width="img.width" :height="img.height">
        </div>
        <p v-if="wedding?.coverImage === img.url" class="hint small">{{ t('admin.gallery.coverPositionHint') }}</p>
        <ul class="uses">
          <li v-for="u in usesOf(img.url, img)" :key="u" class="badge responded">{{ u }}</li>
          <li v-if="!usesOf(img.url, img).length" class="badge">{{ t('admin.assets.unused') }}</li>
        </ul>
        <form class="form-grid" @submit.prevent="saveText(img)">
          <AdminLocalizedField v-model="img.caption" :label="t('admin.gallery.caption')" />
          <AdminLocalizedField v-model="img.alt" :label="t('admin.gallery.alt')" />
          <div class="actions">
            <button type="submit" class="btn btn-outline btn-sm">{{ t('common.save') }}</button>
            <label class="check small"><input type="checkbox" :checked="img.visible" @change="patch(img, { visible: !img.visible })"> {{ t('admin.gallery.visible') }}</label>
          </div>
        </form>
        <div class="row-actions">
          <template v-if="filter === 'all'">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" :aria-label="t('admin.gallery.moveUp')" @click="move(i, -1)">←</button>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === images.length - 1" :aria-label="t('admin.gallery.moveDown')" @click="move(i, 1)">→</button>
          </template>
          <button type="button" class="btn btn-ghost btn-sm" @click="copy(img.url)">{{ t('admin.assets.copy') }}</button>
          <button v-if="wedding?.coverImage !== img.url" type="button" class="btn btn-ghost btn-sm" @click="setCover(img)">{{ t('admin.gallery.cover') }}</button>
          <button type="button" class="btn btn-danger btn-sm" @click="remove(img)">{{ t('common.delete') }}</button>
        </div>
      </li>
    </ul>

    <section v-if="linked.length && filter !== 'unused'" class="panel linked">
      <h2>{{ t('admin.assets.external') }}</h2>
      <ul>
        <li v-for="url in linked" :key="url">
          <img :src="url" alt="" loading="lazy">
          <span class="uses"><span v-for="u in usesOf(url)" :key="u" class="badge responded">{{ u }}</span></span>
          <button type="button" class="btn btn-ghost btn-sm" @click="copy(url)">{{ t('admin.assets.copy') }}</button>
        </li>
      </ul>
    </section>
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
.uses { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-1); }
.uses .badge { white-space: normal; }
/* Cover: cropped 4:5 like on the invitation, with the chosen point marked */
.cover-crop { display: block; width: 100%; padding: 0; border: 0; cursor: crosshair; background: none; }
.cover-crop img { aspect-ratio: 4 / 5; }
.focus { position: absolute; width: 18px; height: 18px; translate: -50% -50%; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4); pointer-events: none; }
.linked h2 { font-size: 1.1rem; margin-bottom: var(--space-3); }
.linked ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.linked li { display: flex; align-items: center; gap: var(--space-3); }
.linked img { width: 4rem; height: 3rem; object-fit: cover; border-radius: var(--radius-sm); }
.actions { display: flex; align-items: center; gap: var(--space-3); }
.row-actions { display: flex; flex-wrap: wrap; gap: var(--space-1); justify-content: flex-end; }
</style>
