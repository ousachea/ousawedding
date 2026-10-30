<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, wedding, loadWedding, loadList } = useCurrentWedding()
const { me } = useAdminSession()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()
const config = useRuntimeConfig().public


// Editable copy of the wedding; saved as one PATCH
type Draft = Omit<Wedding, 'id' | 'createdAt' | 'updatedAt' | 'isSample'>
const draft = ref<Draft | null>(null)
watch(wedding, (w, old) => {
  if (!w) return
  // The big day was saved from the sidebar: take the moved dates, keep unsaved edits here
  if (draft.value && old?.id === w.id && old.date !== w.date) {
    draft.value.date = w.date
    draft.value.rsvp.deadline = w.rsvp.deadline
    return
  }
  const { id: _id, createdAt: _c, updatedAt: _u, isSample: _s, ...rest } = structuredClone(toRaw(w))
  // Times are entered in the admin's own timezone, taken from the browser
  draft.value = { partnerPhotos: { partner1: '', partner2: '' }, ...rest, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || rest.timezone }
}, { immediate: true })

const saving = ref(false)
async function save() {
  if (!draft.value || saving.value) return
  saving.value = true
  try {
    await api(base.value, { method: 'PATCH', body: draft.value })
    await Promise.all([loadWedding(), loadList()])
    push(t('common.saved'))
  } finally {
    saving.value = false
  }
}

// Music is saved as soon as it is uploaded; the draft takes the new address, keeping other unsaved edits
const uploadingMusic = ref(false)
async function uploadMusic(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !draft.value) return
  uploadingMusic.value = true
  try {
    const form = new FormData()
    form.append('music', file)
    const updated = await api<Wedding>(`${base.value}/music`, { method: 'POST', body: form })
    draft.value.musicUrl = updated.musicUrl
    push(t('common.saved'))
  } catch {
    // the error toast is shown by api()
  } finally {
    uploadingMusic.value = false
  }
}

const loc = (key: 'message' | 'story' | 'thanks' | 'apology') => computed<Localized>({
  get: () => ({ km: draft.value!.content.km[key], en: draft.value!.content.en[key] }),
  set: (v) => {
    draft.value!.content.km[key] = v.km
    draft.value!.content.en[key] = v.en
  },
})
const message = loc('message')
const story = loc('story')
const thanks = loc('thanks')
const apology = loc('apology')
const textFields = { story, thanks, apology }
const textLabel = { story: 'admin.settings.story', thanks: 'admin.settings.thanks', apology: 'admin.settings.apology' } as const
const textOrder = computed(() => draft.value!.textOrder ?? [...TEXT_BLOCKS])
function moveText(i: number, by: -1 | 1) {
  const order = [...textOrder.value]
  ;[order[i], order[i + by]] = [order[i + by]!, order[i]!]
  draft.value!.textOrder = order
}
const nameField = (key: 'partner1' | 'partner2' | 'parents1' | 'parents2') => computed<Localized>({
  get: () => ({ km: draft.value!.names.km[key], en: draft.value!.names.en[key] }),
  set: (v) => {
    draft.value!.names.km[key] = v.km
    draft.value!.names.en[key] = v.en
  },
})
const partner1 = nameField('partner1')
const partner2 = nameField('partner2')
const parents1 = nameField('parents1')
const parents2 = nameField('parents2')

// Partner photos are picked from the uploaded gallery images
const images = ref<GalleryImage[]>([])
watch(base, async () => { images.value = await api<GalleryImage[]>(`${base.value}/gallery`).catch(() => []) }, { immediate: true })
const photos = computed(() => draft.value!.partnerPhotos!)
const imageLabel = (img: GalleryImage) => img.caption.en || img.caption.km || img.url.split('/').pop()
const shareField = (key: 'title' | 'description') => computed<Localized>({
  get: () => ({ km: draft.value!.share.km[key], en: draft.value!.share.en[key] }),
  set: (v) => {
    draft.value!.share.km[key] = v.km
    draft.value!.share.en[key] = v.en
  },
})
const shareTitle = shareField('title')
const shareDescription = shareField('description')

// The section of the invitation the preview scrolls to, following what is being edited
const previewSection = ref('home')
</script>

<template>
  <div v-if="draft" class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.settings') }}</h1>
      <button type="submit" form="settings-form" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
    </div>

    <div class="editor">
    <AdminPreview :draft="draft" :section="previewSection" />

    <form id="settings-form" class="sections" @submit.prevent="save">
      <section class="panel form-grid" @focusin="previewSection = 'home'">
        <h2>{{ t('admin.settings.couple') }}</h2>
        <AdminLocalizedField v-model="partner1" :label="t('admin.settings.partner1')" required />
        <AdminLocalizedField v-model="partner2" :label="t('admin.settings.partner2')" required />
        <AdminLocalizedField v-model="parents1" :label="t('admin.settings.parentsOf', { name: draft.names.en.partner1 })" multiline />
        <AdminLocalizedField v-model="parents2" :label="t('admin.settings.parentsOf', { name: draft.names.en.partner2 })" multiline />
        <fieldset v-for="key in (['partner1', 'partner2'] as const)" :key="key" class="field photo-pick">
          <legend>{{ t('admin.settings.photoOf', { name: draft.names.en[key] }) }}</legend>
          <div class="photo-grid">
            <label class="photo-opt none">
              <input v-model="photos[key]" type="radio" :name="`photo-${key}`" value="" class="visually-hidden">
              <span>{{ t('admin.settings.noPhoto') }}</span>
            </label>
            <!-- A photo set before (e.g. by URL) that is not in the gallery stays selectable -->
            <label v-if="photos[key] && !images.some(img => img.url === photos[key])" class="photo-opt">
              <input v-model="photos[key]" type="radio" :name="`photo-${key}`" :value="photos[key]" class="visually-hidden">
              <img :src="photos[key]" alt="">
            </label>
            <label v-for="img in images" :key="img.id" class="photo-opt" :title="imageLabel(img)">
              <input v-model="photos[key]" type="radio" :name="`photo-${key}`" :value="img.url" class="visually-hidden" :aria-label="imageLabel(img)">
              <img :src="img.thumbUrl || img.url" alt="" loading="lazy">
            </label>
          </div>
        </fieldset>
        <p class="hint">{{ t('admin.settings.photoHint') }}</p>
        <div class="field">
          <label for="s-mono">{{ t('admin.settings.monogram') }}</label>
          <input id="s-mono" v-model="draft.monogram" maxlength="12">
        </div>
        <div class="field">
          <label for="s-slug">{{ t('admin.settings.slug') }}</label>
          <input id="s-slug" v-model="draft.slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" required>
          <p class="hint">/{{ draft.slug }}</p>
        </div>
      </section>

      <section class="panel form-grid" @focusin="previewSection = 'home'">
        <h2>{{ t('admin.settings.content') }}</h2>
        <AdminLocalizedField v-model="message" :label="t('admin.settings.message')" multiline />
        <!-- Shown on the page in this order -->
        <div v-for="(key, i) in textOrder" :key="key" class="text-block" @focusin.stop="previewSection = key">
          <AdminLocalizedField :model-value="textFields[key].value" :label="t(textLabel[key])" multiline @update:model-value="textFields[key].value = $event" />
          <div class="move">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" :aria-label="`${t('admin.settings.moveUp')}: ${t(textLabel[key])}`" @click="moveText(i, -1)">↑</button>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === textOrder.length - 1" :aria-label="`${t('admin.settings.moveDown')}: ${t(textLabel[key])}`" @click="moveText(i, 1)">↓</button>
          </div>
        </div>
        <div class="field">
          <label for="s-cover">{{ t('admin.settings.cover') }}</label>
          <input id="s-cover" v-model="draft.coverImage">
          <p class="hint">{{ t('admin.settings.coverHint') }}</p>
        </div>
        <div class="field">
          <label for="s-lang">{{ t('admin.settings.language') }}</label>
          <select id="s-lang" v-model="draft.defaultLocale">
            <option value="km">{{ t('common.khmer') }}</option>
            <option value="en">{{ t('common.english') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="s-music">{{ t('admin.settings.music') }}</label>
          <!-- Not type="url": uploaded music has a site path ("/uploads/…"), which the browser would reject; the server checks it -->
          <input id="s-music" v-model="draft.musicUrl">
          <label class="btn btn-ghost btn-sm music-upload" :class="{ busy: uploadingMusic }">
            <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a" class="visually-hidden" :disabled="uploadingMusic" @change="uploadMusic">
            {{ uploadingMusic ? t('admin.settings.musicUploading') : `+ ${t('admin.settings.musicUpload')}` }}
          </label>
          <audio v-if="draft.musicUrl" :src="draft.musicUrl" controls preload="none" class="music-preview" />
          <p class="hint">{{ t('admin.settings.musicHint') }}</p>
        </div>
      </section>

      <section class="panel form-grid" @focusin="previewSection = 'rsvp'">
        <h2>{{ t('admin.settings.rsvp') }}</h2>
        <div class="field">
          <label for="s-deadline">{{ t('admin.invitations.deadline') }}</label>
          <input id="s-deadline" v-model="draft.rsvp.deadline" type="datetime-local" required>
        </div>
        <div class="field">
          <label for="s-form">{{ t('admin.settings.rsvpForm') }}</label>
          <input id="s-form" v-model="draft.rsvp.formUrl" type="url" placeholder="https://forms.gle/…">
          <p class="hint">{{ t('admin.settings.rsvpFormHint') }}</p>
        </div>
        <h2>{{ t('admin.settings.privacy') }}</h2>
        <label class="check"><input v-model="draft.privacy.allowIndexing" type="checkbox"> {{ t('admin.settings.allowIndexing') }}</label>
      </section>

      <section class="panel form-grid" @focusin="previewSection = 'contact'">
        <h2>{{ t('admin.settings.contact') }}</h2>
        <div class="form-grid cols-3">
          <div class="field">
            <label for="s-cname">{{ t('admin.settings.contactName') }}</label>
            <input id="s-cname" v-model="draft.contact.name" maxlength="120">
          </div>
          <div class="field">
            <label for="s-cphone">{{ t('admin.settings.contactPhone') }}</label>
            <input id="s-cphone" v-model="draft.contact.phone" type="tel" maxlength="40">
          </div>
          <div class="field">
            <label for="s-cemail">{{ t('admin.settings.contactEmail') }}</label>
            <input id="s-cemail" v-model="draft.contact.email" type="email">
          </div>
        </div>
        <h2>{{ t('admin.settings.share') }}</h2>
        <AdminLocalizedField v-model="shareTitle" :label="t('admin.settings.shareTitle')" />
        <AdminLocalizedField v-model="shareDescription" :label="t('admin.settings.shareDescription')" multiline />
        <AdminSharePreview :draft="draft" @share-image="draft.shareImage = $event" />
      </section>

      <div><button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button></div>
    </form>
    </div>


    <section class="panel form-grid">
      <h2>{{ t('admin.settings.backup') }}</h2>
      <p class="muted small">{{ t('admin.settings.backupHint') }}</p>
      <div><a :href="`${base}/backup`" class="btn btn-outline" download>{{ t('admin.settings.downloadBackup') }}</a></div>
      <p class="muted small">{{ t('admin.settings.version') }}: {{ config.version || '–' }}<template v-if="config.commit"> ({{ config.commit }})</template></p>
    </section>
  </div>
</template>

<style scoped>
.sections { display: flex; flex-direction: column; gap: var(--space-5); }
.music-upload { align-self: flex-start; cursor: pointer; }
.music-upload.busy { opacity: 0.7; cursor: progress; }
.music-upload:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 3px; }
.music-preview { width: 100%; max-width: 24rem; }
.panel h2 { font-size: 1.3rem; }
.photo-pick { border: 0; padding: 0; margin: 0; min-width: 0; }
.photo-pick legend { padding: 0; margin-bottom: var(--space-2); font-weight: 500; }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(5rem, 1fr)); gap: var(--space-2); }
.photo-opt { display: grid; place-items: center; aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; background: var(--c-line-soft); outline: 2px solid transparent; outline-offset: 2px; transition: outline-color 0.15s; }
.photo-opt img { width: 100%; height: 100%; object-fit: cover; }
.photo-opt.none span { font-size: 0.75rem; text-align: center; padding: var(--space-1); }
.photo-opt:has(input:checked) { outline-color: var(--c-secondary); }
.photo-opt:has(input:focus-visible) { outline-color: var(--c-secondary); outline-style: dashed; }
.narrow { max-width: 14rem; }
.text-block { position: relative; }
.move { position: absolute; top: -0.4rem; right: 0; display: flex; gap: var(--space-1); }
.editor { display: grid; gap: var(--space-5); align-items: start; }
@media (min-width: 1100px) {
  .editor { grid-template-columns: minmax(0, 1fr) 380px; }
  .preview { grid-column: 2; grid-row: 1; }
}
</style>
