<script setup lang="ts">
// One step of the wedding's details (couple, words, replies or share); every step saves the whole wedding
const props = defineProps<{ part: 'couple' | 'words' | 'replies' | 'share' }>()
const { t, locale } = useI18n()
const { continueIf } = useAdminSteps()
const { base, wedding, loadWedding, loadList } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const config = useRuntimeConfig().public


// Editable copy of the wedding; saved as one PATCH
type Draft = Omit<Wedding, 'id' | 'createdAt' | 'updatedAt' | 'isSample'>
const draft = ref<Draft | null>(null)
watch(wedding, (w) => {
  if (!w) return
  const { id: _id, createdAt: _c, updatedAt: _u, isSample: _s, ...rest } = structuredClone(toRaw(w))
  // Times are entered in the admin's own timezone, taken from the browser
  draft.value = { partnerPhotos: { partner1: '', partner2: '' }, gifts: [], ...rest, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || rest.timezone }
}, { immediate: true })

const saving = ref(false)
async function save(e?: Event) {
  if (!draft.value || saving.value) return
  saving.value = true
  try {
    await api(base.value, { method: 'PATCH', body: draft.value })
    await Promise.all([loadWedding(), loadList()])
    push(t('common.saved'))
  } finally {
    saving.value = false
  }
  await continueIf(e)
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

// Banks' KHQR images differ in framing (header, name, borders), so each is cut down to the code alone,
// square on white: every code then shows at the same size. Returns null when no code is found.
async function cropQr(file: File): Promise<Blob | null> {
  const bmp = await createImageBitmap(file)
  const { width: w, height: h } = bmp
  const src = Object.assign(document.createElement('canvas'), { width: w, height: h })
  const ctx = src.getContext('2d')!
  ctx.drawImage(bmp, 0, 0)
  const px = ctx.getImageData(0, 0, w, h).data
  // Black only: the red KHQR header and grey text don't count
  const dark = (x: number, y: number) => { const i = (y * w + x) * 4; return px[i]! < 80 && px[i + 1]! < 80 && px[i + 2]! < 80 }
  // The longest stretch of lines with enough black, bridging small gaps: the code
  const block = (n: number, busy: (i: number) => boolean) => {
    const gap = Math.max(4, n * 0.02)
    let best = [0, -1]; let start = -1; let last = -1
    for (let i = 0; i < n; i++) {
      if (!busy(i)) continue
      if (start < 0 || i - last > gap) start = i
      last = i
      if (last - start > best[1]! - best[0]!) best = [start, last]
    }
    return best as [number, number]
  }
  const [y0, y1] = block(h, (y) => { let c = 0; for (let x = 0; x < w; x += 2) if (dark(x, y)) c++; return c > w * 0.03 })
  const [x0, x1] = block(w, (x) => { let c = 0; for (let y = y0; y <= y1; y += 2) if (dark(x, y)) c++; return c > (y1 - y0) * 0.03 })
  const side = Math.max(x1 - x0, y1 - y0)
  if (side < 100) return null
  const out = Object.assign(document.createElement('canvas'), { width: 600, height: 600 })
  const o = out.getContext('2d')!
  o.fillStyle = '#fff'
  o.fillRect(0, 0, 600, 600)
  const pad = 600 * 0.07
  o.drawImage(src, (x0 + x1 - side) / 2, (y0 + y1 - side) / 2, side, side, pad, pad, 600 - 2 * pad, 600 - 2 * pad)
  return new Promise(resolve => out.toBlob(resolve, 'image/png'))
}

// KHQR codes for gifts: the image is uploaded straight away, the name and bank are saved with the form
const uploadingGift = ref(false)
async function uploadGift(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !draft.value) return
  uploadingGift.value = true
  try {
    const form = new FormData()
    form.append('image', await cropQr(file).catch(() => null) ?? file)
    const { url } = await api<{ url: string }>(`${base.value}/gift-qr`, { method: 'POST', body: form })
    draft.value.gifts!.push({ id: Math.random().toString(36).slice(2, 10), name: '', bank: '', image: url })
  } catch {
    // the error toast is shown by api()
  } finally {
    uploadingGift.value = false
  }
}

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


// A personal link for any name: the address plus the name, spaces as dashes (see README, Personal links)
const site = (config.siteUrl || (import.meta.client ? location.origin : '')).replace(/\/$/, '')
const guestName = ref('')
const guestLang = ref<Locale>(locale.value as Locale)
const guestLink = computed(() => draft.value && guestName.value.trim()
  ? `${site}${guestLang.value === 'km' ? '/km' : ''}/${draft.value.slug}/${encodeURIComponent(guestName.value.trim().replace(/\s+/g, '-'))}`
  : '')
async function copyLink() {
  try { await navigator.clipboard.writeText(guestLink.value); push(t('admin.share.copied')) } catch {}
}
</script>

<template>
  <div v-if="draft" class="editor">
    <form id="step-form" class="sections" @submit.prevent="save">
      <template v-if="part === 'couple'">
        <section class="panel form-grid">
          <h2>{{ t('admin.settings.couple') }}</h2>
          <AdminLocalizedField v-model="partner1" :label="t('admin.settings.partner1')" required />
          <AdminLocalizedField v-model="partner2" :label="t('admin.settings.partner2')" required />
          <AdminLocalizedField v-model="parents1" :label="t('admin.settings.parentsOf', { name: draft.names.en.partner1 })" multiline />
          <AdminLocalizedField v-model="parents2" :label="t('admin.settings.parentsOf', { name: draft.names.en.partner2 })" multiline />
          <div class="field narrow">
            <label for="s-mono">{{ t('admin.settings.monogram') }}</label>
            <input id="s-mono" v-model="draft.monogram" maxlength="12">
          </div>
        </section>

        <section class="panel form-grid">
          <h2>{{ t('admin.settings.date') }}</h2>
          <div class="field narrow">
            <label for="s-date">{{ t('admin.settings.dateLabel') }}</label>
            <input id="s-date" v-model="draft.date" type="datetime-local" required>
            <p class="hint">{{ t('admin.settings.dateHint') }}</p>
          </div>
          <div class="field narrow">
            <label for="s-lang">{{ t('admin.settings.language') }}</label>
            <select id="s-lang" v-model="draft.defaultLocale">
              <option value="km">{{ t('common.khmer') }}</option>
              <option value="en">{{ t('common.english') }}</option>
            </select>
          </div>
        </section>

        <section class="panel form-grid">
          <h2>{{ t('admin.settings.photos') }}</h2>
          <p class="hint">{{ t('admin.settings.photoHint') }}</p>
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
        </section>
      </template>

      <template v-else-if="part === 'words'">
        <section class="panel form-grid">
          <h2>{{ t('admin.settings.content') }}</h2>
          <AdminLocalizedField v-model="message" :label="t('admin.settings.message')" multiline />
          <!-- Shown on the page in this order -->
          <div v-for="(key, i) in textOrder" :key="key" class="text-block">
            <AdminLocalizedField :model-value="textFields[key].value" :label="t(textLabel[key])" multiline @update:model-value="textFields[key].value = $event" />
            <div class="move">
              <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" :aria-label="`${t('admin.settings.moveUp')}: ${t(textLabel[key])}`" @click="moveText(i, -1)">↑</button>
              <button type="button" class="btn btn-ghost btn-sm" :disabled="i === textOrder.length - 1" :aria-label="`${t('admin.settings.moveDown')}: ${t(textLabel[key])}`" @click="moveText(i, 1)">↓</button>
            </div>
          </div>
        </section>

        <section class="panel form-grid">
          <h2>{{ t('admin.settings.music') }}</h2>
          <div class="field">
            <label for="s-music">{{ t('admin.settings.musicLink') }}</label>
            <!-- Not type="url": uploaded music has a site path ("/uploads/…"), which the browser would reject; the server checks it -->
            <input id="s-music" v-model="draft.musicUrl">
            <label class="btn btn-outline btn-sm file-btn" :class="{ busy: uploadingMusic }">
              <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a" class="visually-hidden" :disabled="uploadingMusic" @change="uploadMusic">
              {{ uploadingMusic ? t('admin.settings.musicUploading') : t('admin.settings.musicUpload') }}
            </label>
            <audio v-if="draft.musicUrl" :src="draft.musicUrl" controls preload="none" class="music-preview" />
            <p class="hint">{{ t('admin.settings.musicHint') }}</p>
          </div>
        </section>
      </template>

      <template v-else-if="part === 'replies'">
        <section class="panel form-grid">
          <h2>{{ t('admin.settings.rsvp') }}</h2>
          <div class="field narrow">
            <label for="s-deadline">{{ t('admin.invitations.deadline') }}</label>
            <input id="s-deadline" v-model="draft.rsvp.deadline" type="datetime-local" required>
          </div>
          <div class="field">
            <label for="s-form">{{ t('admin.settings.rsvpForm') }}</label>
            <input id="s-form" v-model="draft.rsvp.formUrl" type="url" placeholder="https://forms.gle/…">
            <p class="hint">{{ t('admin.settings.rsvpFormHint') }}</p>
          </div>
        </section>

        <section class="panel form-grid">
          <h2>{{ t('admin.settings.gifts') }}</h2>
          <p class="hint">{{ t('admin.settings.giftsHint') }}</p>
          <div v-for="(g, i) in draft.gifts" :key="g.id" class="gift-row">
            <img :src="g.image" alt="" class="gift-thumb">
            <div class="form-grid">
              <div class="field">
                <label :for="`g-name-${g.id}`">{{ t('admin.settings.giftName') }}</label>
                <input :id="`g-name-${g.id}`" v-model="g.name" maxlength="120" required>
              </div>
              <div class="field">
                <label :for="`g-bank-${g.id}`">{{ t('admin.settings.giftBank') }}</label>
                <input :id="`g-bank-${g.id}`" v-model="g.bank" maxlength="80" placeholder="ABA, ACLEDA, Wing…">
              </div>
            </div>
            <button type="button" class="btn btn-ghost btn-sm" @click="draft.gifts!.splice(i, 1)">{{ t('common.delete') }}</button>
          </div>
          <label v-if="draft.gifts!.length < 4" class="btn btn-outline btn-sm file-btn" :class="{ busy: uploadingGift }">
            <input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden" :disabled="uploadingGift" @change="uploadGift">
            {{ uploadingGift ? t('admin.settings.musicUploading') : t('admin.settings.giftAdd') }}
          </label>
        </section>

        <section class="panel form-grid">
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
        </section>
      </template>

      <template v-else>
        <section class="panel form-grid">
          <h2>{{ t('admin.share.linkTitle') }}</h2>
          <p class="hint">{{ t('admin.share.linkHint') }}</p>
          <div class="link-maker">
            <div class="field">
              <label for="s-guest">{{ t('admin.share.guestName') }}</label>
              <input id="s-guest" v-model="guestName" maxlength="120" placeholder="Mr Chea Ousa">
            </div>
            <div class="field">
              <label for="s-guest-lang">{{ t('common.language') }}</label>
              <select id="s-guest-lang" v-model="guestLang">
                <option value="km">{{ t('common.khmer') }}</option>
                <option value="en">{{ t('common.english') }}</option>
              </select>
            </div>
          </div>
          <div v-if="guestLink" class="link-out">
            <code>{{ guestLink }}</code>
            <button type="button" class="btn btn-outline btn-sm" @click="copyLink">{{ t('admin.share.copy') }}</button>
          </div>
          <div class="field narrow">
            <label for="s-slug">{{ t('admin.settings.slug') }}</label>
            <input id="s-slug" v-model="draft.slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" required>
            <p class="hint">{{ site }}/{{ draft.slug }}</p>
          </div>
        </section>

        <section class="panel form-grid">
          <h2>{{ t('admin.settings.share') }}</h2>
          <AdminLocalizedField v-model="shareTitle" :label="t('admin.settings.shareTitle')" />
          <AdminLocalizedField v-model="shareDescription" :label="t('admin.settings.shareDescription')" multiline />
          <AdminSharePreview :draft="draft" @share-image="draft.shareImage = $event" />
          <label class="check"><input v-model="draft.privacy.allowIndexing" type="checkbox"> {{ t('admin.settings.allowIndexing') }}</label>
        </section>

        <section class="panel form-grid">
          <h2>{{ t('admin.dashboard.publishTitle') }}</h2>
          <p class="hint">{{ t('admin.dashboard.publishHint') }}</p>
          <pre class="cmd">git add content public/uploads
git commit -m "Update invitation"
git push</pre>
          <h2>{{ t('admin.settings.backup') }}</h2>
          <p class="hint">{{ t('admin.settings.backupHint') }}</p>
          <div><a :href="`${base}/backup`" class="btn btn-outline btn-sm" download>{{ t('admin.settings.downloadBackup') }}</a></div>
          <p class="muted small">{{ t('admin.settings.version') }}: {{ config.version || '–' }}<template v-if="config.commit"> ({{ config.commit }})</template></p>
        </section>
      </template>

      <AdminStepNav form="step-form" :saving="saving" />
    </form>
  </div>
</template>

<style scoped>
.sections { display: flex; flex-direction: column; gap: var(--space-5); }
.file-btn { align-self: flex-start; cursor: pointer; }
.file-btn.busy { opacity: 0.7; cursor: progress; }
.file-btn:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 3px; }
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
.narrow { max-width: 22rem; }
.link-maker { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr) 9rem; }
.link-out { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--c-accent) 10%, var(--c-surface)); }
.link-out code { flex: 1 1 16rem; overflow-wrap: anywhere; font-size: 0.9rem; }
.cmd { margin: 0; padding: var(--space-3); border-radius: var(--radius-sm); background: var(--c-text); color: var(--c-bg); font-size: 0.85rem; overflow-x: auto; }
.gift-row { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: var(--space-3) var(--space-4); align-items: start; padding-block: var(--space-3); border-top: 1px solid var(--c-line-soft); }
.gift-row > .btn { grid-column: 2; justify-self: start; }
.gift-thumb { width: 6rem; aspect-ratio: 1; object-fit: contain; border-radius: var(--radius); background: #fff; border: 1px solid var(--c-line); }
.text-block { position: relative; }
.move { position: absolute; top: -0.4rem; right: 0; display: flex; gap: var(--space-1); }
.editor { display: grid; gap: var(--space-5); align-items: start; max-width: 52rem; }
</style>
