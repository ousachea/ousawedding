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
  try { await navigator.clipboard.writeText(new URL(url, location.origin).href); push(t('admin.assets.copied')) } catch { push(t('common.error'), 'error') }
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
// Arrows move a photo one place; the order is saved once the taps stop, in one request
let saveTimer: ReturnType<typeof setTimeout> | undefined
const saveOrder = () => api(`${base.value}/gallery/reorder`, { method: 'POST', body: { ids: images.value.map(i => i.id) } }).catch(load)
onBeforeUnmount(() => { if (saveTimer) { clearTimeout(saveTimer); saveOrder() } })
function move(index: number, step: number) {
  const list = [...images.value]
  const [item] = list.splice(index, 1)
  list.splice(index + step, 0, item!)
  images.value = list
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveTimer = undefined; saveOrder() }, 500)
}

// Photos dropped on the upload box go through the same upload as the file picker
const dragging = ref(false)
async function drop(e: DragEvent) {
  dragging.value = false
  if (!e.dataTransfer?.files.length || progress.value) return
  if (await uploadFiles({ target: { files: e.dataTransfer.files } } as unknown as Event)) await load()
}
const cover = computed(() => images.value.find(img => img.url === wedding.value?.coverImage) ?? null)
const coverPoint = computed(() => (wedding.value?.coverPosition ?? '50% 50%').split(' '))
const name = (img: GalleryImage, i: number) => img.caption[locale.value as Locale] || img.caption.en || `#${i + 1}`
</script>

<template>
  <div class="admin-page">
    <label
      class="drop" :class="{ busy: progress, over: dragging }"
      @dragover.prevent="dragging = true" @dragleave="dragging = false" @drop.prevent="drop"
    >
      <input type="file" accept="image/jpeg,image/png,image/webp" multiple class="visually-hidden" :disabled="!!progress" @change="upload">
      <span class="drop-icon" aria-hidden="true">+</span>
      <span class="drop-title">{{ progress ? t('admin.gallery.uploading', progress) : t('admin.gallery.upload') }}</span>
      <span class="muted small">{{ t('admin.gallery.dropHint') }} {{ t('admin.gallery.hint') }}</span>
    </label>

    <section v-if="cover" class="panel cover">
      <!-- The cover is shown cropped like on the invitation; clicking sets the point that stays in view -->
      <button type="button" class="cover-crop" :aria-label="t('admin.gallery.coverPositionHint')" @click="setCoverPosition">
        <img :src="cover.url" alt="" :style="{ objectPosition: wedding?.coverPosition }">
        <span class="focus" :style="{ left: coverPoint[0], top: coverPoint[1] }" aria-hidden="true" />
      </button>
      <div class="section-head">
        <h2>{{ t('admin.gallery.isCover') }}</h2>
        <p class="hint">{{ t('admin.gallery.coverPositionHint') }}</p>
        <p class="hint">{{ t('admin.gallery.coverChange') }}</p>
      </div>
    </section>

    <div v-if="images.length" class="segmented" role="group">
      <button v-for="f in (['all', 'used', 'unused'] as const)" :key="f" type="button" :class="{ on: filter === f }" :aria-pressed="filter === f" @click="filter = f">
        {{ t(`admin.assets.filter${f[0]!.toUpperCase()}${f.slice(1)}`) }} <span class="n tabular">{{ images.filter(img => matches(f, img)).length }}</span>
      </button>
    </div>
    <p v-if="filter === 'all' && images.length > 1" class="muted small">{{ t('admin.gallery.orderHint') }}</p>

    <p v-if="loading && !images.length" class="muted">{{ t('common.loading') }}</p>
    <div v-else-if="!shown.length" class="panel empty-state"><p>{{ t('admin.gallery.empty') }}</p></div>
    <TransitionGroup v-else tag="ul" name="reorder" class="grid">
      <li v-for="(img, i) in shown" :key="img.id" class="tile" :class="{ hidden: !img.visible }">
        <div class="thumb">
          <img :src="img.thumbUrl || img.url" :alt="img.alt.en || img.caption.en" loading="lazy">
          <span class="flags">
            <span v-if="wedding?.coverImage === img.url" class="flag"><WeddingIcon name="star" /> {{ t('admin.gallery.isCover') }}</span>
            <span v-if="!img.visible" class="flag dim">{{ t('admin.gallery.hidden') }}</span>
          </span>
        </div>
        <div class="tile-bar">
          <AdminMoveButtons v-if="filter === 'all'" horizontal :index="i" :count="images.length" :name="name(img, i)" @move="move(i, $event)" />
          <label class="switch">
            <input type="checkbox" :checked="img.visible" @change="patch(img, { visible: !img.visible })">
            <span class="track" aria-hidden="true" />
            <span class="small">{{ t('admin.gallery.visible') }}</span>
          </label>
        </div>
        <ul class="uses">
          <li v-for="u in usesOf(img.url, img)" :key="u" class="badge responded">{{ u }}</li>
          <li v-if="!usesOf(img.url, img).length" class="badge">{{ t('admin.assets.unused') }}</li>
        </ul>
        <!-- Folded away so the photos stay easy to scan; marked when a caption is filled in -->
        <details class="fold">
          <summary>
            {{ t('admin.gallery.more') }}
            <span v-if="img.caption.en || img.caption.km || img.alt.en || img.alt.km" class="filled" :title="t('admin.gallery.text')"><WeddingIcon name="check" /></span>
          </summary>
          <form class="form-grid" @submit.prevent="saveText(img)">
            <AdminLocalizedField v-model="img.caption" :label="t('admin.gallery.caption')" />
            <AdminLocalizedField v-model="img.alt" :label="t('admin.gallery.alt')" />
            <div><button type="submit" class="btn btn-outline btn-sm">{{ t('common.save') }}</button></div>
          </form>
          <div class="row-actions">
            <button v-if="wedding?.coverImage !== img.url" type="button" class="btn btn-ghost btn-sm" @click="setCover(img)">{{ t('admin.gallery.cover') }}</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="copy(img.url)">{{ t('admin.assets.copy') }}</button>
            <button type="button" class="btn btn-ghost btn-sm delete" @click="remove(img)">{{ t('common.delete') }}</button>
          </div>
        </details>
      </li>
    </TransitionGroup>

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
    <AdminStepNav />
  </div>
</template>

<style scoped>
.drop {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-1); padding: var(--space-5) var(--space-4);
  border: 2px dashed var(--c-line); border-radius: var(--radius-lg); background: var(--c-surface); text-align: center; cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}
.drop.over { border-color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 5%, var(--c-surface)); }
@media (hover: hover) { .drop:hover { border-color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 5%, var(--c-surface)); } }
.drop:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 3px; }
.drop.busy { cursor: progress; }
.drop-icon { display: grid; place-items: center; width: 3rem; height: 3rem; border-radius: 50%; background: var(--c-secondary); color: var(--c-on-secondary); font-size: 1.8rem; line-height: 1; }
.drop-title { font-size: 1.1rem; font-weight: 600; color: var(--c-secondary); }

.cover { display: grid; gap: var(--space-4); align-items: center; }
@media (min-width: 640px) { .cover { grid-template-columns: 12rem minmax(0, 1fr); } }
.cover-crop { position: relative; display: block; width: 100%; max-width: 14rem; padding: 0; border: 0; cursor: crosshair; background: none; }
.cover-crop img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; border-radius: var(--radius); }
.focus { position: absolute; width: 20px; height: 20px; translate: -50% -50%; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.45); pointer-events: none; }

.grid { list-style: none; padding: 0; margin: 0; display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr)); align-items: start; }
.tile { display: flex; flex-direction: column; gap: var(--space-2); padding: var(--space-2); background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius); box-shadow: var(--shadow-sm); }
.thumb { position: relative; }
/* 3:4, cropped as on the invitation */
.thumb img { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; object-position: 50% 35%; border-radius: calc(var(--radius) - var(--space-2) - 1px); background: var(--c-line-soft); }
.tile.hidden .thumb img { opacity: 0.4; }
.flags { position: absolute; top: var(--space-2); left: var(--space-2); display: flex; flex-wrap: wrap; gap: var(--space-1); }
.flag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: var(--c-secondary); color: var(--c-on-secondary); font-size: 0.75rem; font-weight: 600; }
.flag.dim { background: rgb(0 0 0 / 0.6); color: #fff; }
.tile-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); }
.tile .uses, .tile .fold { padding-inline: var(--space-1); }
.uses { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: var(--space-1); }
.uses .badge { white-space: normal; }
.filled { color: var(--c-success); }
.row-actions { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-3); }
.delete { color: var(--c-danger); }
@media (prefers-reduced-motion: no-preference) { .reorder-move { transition: transform 0.3s var(--ease-in-out); } }

/* On/off switch for showing a photo in the public gallery */
.switch { display: inline-flex; align-items: center; gap: var(--space-2); min-height: 44px; margin-left: auto; cursor: pointer; }
.switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch .track { position: relative; width: 2.6rem; height: 1.5rem; border-radius: 999px; background: var(--c-line); transition: background-color 0.2s; }
.switch .track::after { content: ''; position: absolute; top: 3px; left: 3px; width: calc(1.5rem - 6px); height: calc(1.5rem - 6px); border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgb(0 0 0 / 0.25); transition: translate 0.2s var(--ease-in-out), scale 0.2s var(--ease-in-out); }
/* Stretched by the press, it settles back while it slides */
.switch:active .track::after { scale: 1.12 1; }
.switch input:checked + .track { background: var(--c-secondary); }
.switch input:checked + .track::after { translate: 1.1rem 0; }
.switch input:focus-visible + .track { outline: 2px solid var(--c-secondary); outline-offset: 2px; }

.linked h2 { font-size: 1.1rem; margin-bottom: var(--space-3); }
.linked ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.linked li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.linked img { width: 4rem; height: 3rem; object-fit: cover; border-radius: var(--radius-sm); }
</style>
