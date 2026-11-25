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
const { dirty, reset } = useUnsaved(draft)
watch(wedding, (w) => {
  if (!w) return
  const { id: _id, createdAt: _c, updatedAt: _u, isSample: _s, ...rest } = structuredClone(toRaw(w))
  // Times are entered in the admin's own timezone, taken from the browser
  draft.value = { partnerPhotos: { partner1: '', partner2: '' }, gifts: [], telegramChatId: '', location: { venue: { km: '', en: '' }, address: { km: '', en: '' }, mapUrl: '' }, ...rest, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || rest.timezone }
  reset()
}, { immediate: true })

const saving = ref(false)
async function save(e?: Event) {
  if (!draft.value || saving.value) return
  saving.value = true
  try {
    await api(base.value, { method: 'PATCH', body: draft.value })
    reset()
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
function moveText(i: number, by: number) {
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
const people = [
  { key: 'partner1', name: nameField('partner1'), parents: nameField('parents1') },
  { key: 'partner2', name: nameField('partner2'), parents: nameField('parents2') },
] as const
// Which partner's photo choices are open
const picking = ref<'partner1' | 'partner2' | null>(null)

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
// The couple's Telegram chat: they message the bot, then Find lists recent chats to pick from
const chats = ref<Array<{ id: string, name: string }> | null>(null)
const bot = ref('')
const finding = ref(false)
async function findChats() {
  finding.value = true
  try {
    const res = await api<{ bot: string, chats: Array<{ id: string, name: string }> }>('/api/admin/telegram-chats')
    bot.value = res.bot
    chats.value = res.chats
  } catch {
    // the error toast is shown by api()
  } finally {
    finding.value = false
  }
}

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
// The venue map, previewed as guests will see it
const map = computed(() => venueMap(draft.value!.location))
// A pasted Google Maps link fills in the venue and address; the couple checks them and saves
const lookingUp = ref(false)
async function lookupMap() {
  const link = draft.value!.location!.mapUrl.trim()
  if (!link || lookingUp.value) return
  lookingUp.value = true
  try {
    const found = await api<{ mapUrl: string, venue: Localized, address: Localized }>('/api/admin/map-lookup', { method: 'POST', body: { url: link } })
    const loc = draft.value!.location!
    loc.mapUrl = found.mapUrl
    for (const l of ['km', 'en'] as const) {
      if (found.venue[l]) loc.venue[l] = found.venue[l]
      if (found.address[l]) loc.address[l] = found.address[l]
    }
    push(t('admin.location.filled'))
  } catch {
    // the error toast is shown by api()
  } finally {
    lookingUp.value = false
  }
}
// The input's value updates after the paste event
const onMapPaste = () => nextTick(lookupMap)
const shareTitle = shareField('title')
const shareDescription = shareField('description')


// A personal link for any name: the address plus the name, spaces as dashes (see README, Personal links)
const site = (config.siteUrl || (import.meta.client ? location.origin : '')).replace(/\/$/, '')
const guestName = ref('')
const guestLang = ref<Locale>(locale.value as Locale)
const guestLink = computed(() => draft.value && guestName.value.trim()
  ? `${site}${guestLang.value === 'km' ? '/km' : ''}/${draft.value.slug}/${encodeURIComponent(guestName.value.trim().replace(/\s+/g, '-'))}`
  : '')
const shownLink = computed(() => guestLink.value ? decodeURIComponent(guestLink.value) : `${site}/${draft.value?.slug}/…`)
async function copyLink() {
  try { await navigator.clipboard.writeText(guestLink.value); push(t('admin.share.copied')) } catch { push(t('common.error'), 'error') }
}
</script>

<template>
  <div v-if="draft" class="editor">
    <form id="step-form" class="sections" @submit.prevent="save">
      <template v-if="part === 'couple'">
        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.couple') }}</h2>
            <p class="hint">{{ t('admin.couple.hint') }}</p>
          </header>
          <div class="people">
            <div v-for="p in people" :key="p.key" class="person">
              <div class="person-head">
                <img v-if="photos[p.key]" :src="photos[p.key]" alt="" class="avatar">
                <span v-else class="avatar empty" aria-hidden="true">{{ (draft.names.en[p.key] || '?')[0] }}</span>
                <button type="button" class="btn btn-ghost btn-sm" :aria-expanded="picking === p.key" @click="picking = picking === p.key ? null : p.key">
                  {{ photos[p.key] ? t('admin.couple.changePhoto') : t('admin.couple.addPhoto') }}
                </button>
              </div>
              <fieldset v-if="picking === p.key" class="photo-pick">
                <legend>{{ t('admin.settings.photoOf', { name: draft.names.en[p.key] }) }}</legend>
                <p v-if="!images.length" class="hint">{{ t('admin.settings.photoHint') }}</p>
                <div class="photo-grid">
                  <label class="photo-opt none">
                    <input v-model="photos[p.key]" type="radio" :name="`photo-${p.key}`" value="" class="visually-hidden">
                    <span>{{ t('admin.settings.noPhoto') }}</span>
                  </label>
                  <!-- A photo set before (e.g. by URL) that is not in the gallery stays selectable -->
                  <label v-if="photos[p.key] && !images.some(img => img.url === photos[p.key])" class="photo-opt">
                    <input v-model="photos[p.key]" type="radio" :name="`photo-${p.key}`" :value="photos[p.key]" class="visually-hidden">
                    <img :src="photos[p.key]" alt="">
                  </label>
                  <label v-for="img in images" :key="img.id" class="photo-opt" :title="imageLabel(img)">
                    <input v-model="photos[p.key]" type="radio" :name="`photo-${p.key}`" :value="img.url" class="visually-hidden" :aria-label="imageLabel(img)">
                    <img :src="img.thumbUrl || img.url" alt="" loading="lazy">
                  </label>
                </div>
              </fieldset>
              <AdminLocalizedField :model-value="p.name.value" :label="t(`admin.settings.${p.key}`)" required @update:model-value="p.name.value = $event" />
              <AdminLocalizedField :model-value="p.parents.value" :label="t('admin.settings.parentsOf', { name: draft.names.en[p.key] || '…' })" multiline @update:model-value="p.parents.value = $event" />
            </div>
          </div>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.date') }}</h2>
            <p class="hint">{{ t('admin.settings.dateHint') }}</p>
          </header>
          <div class="form-grid cols-3 one-line">
            <div class="field">
              <label for="s-date">{{ t('admin.settings.dateLabel') }}</label>
              <input id="s-date" v-model="draft.date" type="datetime-local" required>
            </div>
            <div class="field">
              <label for="s-lang">{{ t('admin.settings.language') }}</label>
              <select id="s-lang" v-model="draft.defaultLocale">
                <option value="km">{{ t('common.khmer') }}</option>
                <option value="en">{{ t('common.english') }}</option>
              </select>
            </div>
            <div class="field">
              <label for="s-mono">{{ t('admin.settings.monogram') }}</label>
              <input id="s-mono" v-model="draft.monogram" maxlength="12">
            </div>
          </div>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.location.title') }}</h2>
            <p class="hint">{{ t('admin.location.hint') }}</p>
          </header>
          <div class="field">
            <label for="s-map">{{ t('admin.location.mapUrl') }}</label>
            <!-- Pasting a link fills in the rest straight away -->
            <div class="chat-row">
              <input id="s-map" v-model="draft.location!.mapUrl" type="url" placeholder="https://maps.app.goo.gl/…" @paste="onMapPaste">
              <button type="button" class="btn btn-outline" :disabled="lookingUp || !draft.location!.mapUrl" @click="lookupMap">{{ lookingUp ? t('common.loading') : t('admin.location.fill') }}</button>
            </div>
          </div>
          <AdminLocalizedField v-model="draft.location!.venue" :label="t('admin.location.venue')" />
          <AdminLocalizedField v-model="draft.location!.address" :label="t('admin.location.address')" multiline />
          <iframe v-if="map" :src="map.embed" :title="t('admin.location.preview')" loading="lazy" class="map-preview" />
          <p v-else class="muted small">{{ t('admin.location.empty') }}</p>
        </section>
      </template>

      <template v-else-if="part === 'words'">
        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.message') }}</h2>
            <p class="hint">{{ t('admin.words.messageHint') }}</p>
          </header>
          <AdminLocalizedField v-model="message" :label="t('admin.settings.message')" multiline />
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.content') }}</h2>
            <p class="hint">{{ t('admin.words.blocksHint') }}</p>
          </header>
          <!-- Shown on the page in this order -->
          <TransitionGroup tag="ol" name="reorder" class="blocks">
            <li v-for="(key, i) in textOrder" :key="key" class="block">
              <AdminMoveButtons :index="i" :count="textOrder.length" :name="t(textLabel[key])" @move="moveText(i, $event)" />
              <AdminLocalizedField :model-value="textFields[key].value" :label="t(textLabel[key])" multiline @update:model-value="textFields[key].value = $event" />
            </li>
          </TransitionGroup>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.music') }}</h2>
            <p class="hint">{{ t('admin.settings.musicHint') }}</p>
          </header>
          <div class="track">
            <audio v-if="draft.musicUrl" :src="draft.musicUrl" controls preload="none" class="music-preview" />
            <p v-else class="muted">{{ t('admin.overview.noMusic') }}</p>
            <label class="btn btn-outline file-btn" :class="{ busy: uploadingMusic }">
              <input type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a" class="visually-hidden" :disabled="uploadingMusic" @change="uploadMusic">
              {{ uploadingMusic ? t('admin.settings.musicUploading') : t('admin.settings.musicUpload') }}
            </label>
          </div>
          <details class="fold">
            <summary>{{ t('admin.settings.musicLink') }}</summary>
            <div class="field">
              <label for="s-music" class="visually-hidden">{{ t('admin.settings.musicLink') }}</label>
              <!-- Not type="url": uploaded music has a site path ("/uploads/…"), which the browser would reject; the server checks it -->
              <input id="s-music" v-model="draft.musicUrl" placeholder="https://…">
            </div>
          </details>
        </section>
      </template>

      <template v-else-if="part === 'replies'">
        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.rsvp') }}</h2>
            <p class="hint">{{ t('admin.settings.rsvpFormHint') }}</p>
          </header>
          <div class="form-grid cols-2">
            <div class="field">
              <label for="s-deadline">{{ t('admin.invitations.deadline') }}</label>
              <input id="s-deadline" v-model="draft.rsvp.deadline" type="datetime-local" required>
            </div>
            <div class="field">
              <label for="s-form">{{ t('admin.settings.rsvpForm') }}</label>
              <input id="s-form" v-model="draft.rsvp.formUrl" type="url" placeholder="https://forms.gle/…">
            </div>
          </div>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.telegram.title') }}</h2>
            <p class="hint">{{ t('admin.telegram.hint') }}</p>
          </header>
          <p class="status" :class="{ on: draft.telegramChatId }">
            <span class="dot" aria-hidden="true" />{{ draft.telegramChatId ? t('admin.telegram.toCouple') : t('admin.telegram.toOwner') }}
          </p>
          <div class="field">
            <label for="s-chat">{{ t('admin.telegram.chat') }}</label>
            <div class="chat-row">
              <input id="s-chat" v-model="draft.telegramChatId" inputmode="numeric" maxlength="21" :placeholder="t('admin.telegram.ownerChat')" class="tabular">
              <button type="button" class="btn btn-outline" :disabled="finding" @click="findChats">{{ finding ? t('common.loading') : t('admin.telegram.find') }}</button>
            </div>
          </div>
          <template v-if="chats">
            <p class="hint">{{ t('admin.telegram.steps', { bot: `@${bot}` }) }}</p>
            <p v-if="!chats.length" class="muted small">{{ t('admin.telegram.none') }}</p>
            <ul v-else class="chats">
              <li v-for="c in chats" :key="c.id">
                <button type="button" class="btn btn-ghost chat-pick" :class="{ on: draft.telegramChatId === c.id }" :aria-pressed="draft.telegramChatId === c.id" @click="draft.telegramChatId = c.id">
                  <span>{{ c.name }}</span><span class="muted small tabular">{{ c.id }}</span>
                </button>
              </li>
            </ul>
          </template>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.gifts') }}</h2>
            <p class="hint">{{ t('admin.settings.giftsHint') }}</p>
          </header>
          <ul class="gifts">
            <li v-for="(g, i) in draft.gifts" :key="g.id" class="gift">
              <img :src="g.image" alt="" class="gift-thumb">
              <div class="field">
                <label :for="`g-name-${g.id}`">{{ t('admin.settings.giftName') }}</label>
                <input :id="`g-name-${g.id}`" v-model="g.name" maxlength="120" required>
              </div>
              <div class="field">
                <label :for="`g-bank-${g.id}`">{{ t('admin.settings.giftBank') }}</label>
                <input :id="`g-bank-${g.id}`" v-model="g.bank" maxlength="80" placeholder="ABA, ACLEDA, Wing…">
              </div>
              <button type="button" class="btn btn-ghost btn-sm delete" @click="draft.gifts!.splice(i, 1)">{{ t('common.delete') }}</button>
            </li>
            <li v-if="draft.gifts!.length < 4">
              <label class="gift add" :class="{ busy: uploadingGift }">
                <input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden" :disabled="uploadingGift" @change="uploadGift">
                <span class="plus" aria-hidden="true">+</span>
                {{ uploadingGift ? t('admin.settings.musicUploading') : t('admin.settings.giftAdd') }}
              </label>
            </li>
          </ul>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.contact') }}</h2>
            <p class="hint">{{ t('admin.replies.contactHint') }}</p>
          </header>
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
        <section class="panel form-grid guest-links">
          <header class="section-head">
            <h2>{{ t('admin.share.linkTitle') }}</h2>
            <p class="hint">{{ t('admin.share.linkHint') }}</p>
          </header>
          <div class="link-maker">
            <div class="field">
              <label for="s-guest">{{ t('admin.share.guestName') }}</label>
              <input id="s-guest" v-model="guestName" maxlength="120" placeholder="Mr Chea Ousa" autocomplete="off" enterkeyhint="done">
            </div>
            <div class="field">
              <label for="s-guest-lang">{{ t('common.language') }}</label>
              <select id="s-guest-lang" v-model="guestLang">
                <option value="km">{{ t('common.khmer') }}</option>
                <option value="en">{{ t('common.english') }}</option>
              </select>
            </div>
          </div>
          <div class="link-out" :class="{ empty: !guestLink }">
            <!-- Shortened in the middle: the guest's name, at the end, always shows -->
            <code :title="guestLink"><span>{{ shownLink.slice(0, -14) }}</span><span>{{ shownLink.slice(-14) }}</span></code>
            <button type="button" class="btn btn-primary btn-sm" :disabled="!guestLink" @click="copyLink">{{ t('admin.share.copy') }}</button>
          </div>
        </section>

        <section class="panel form-grid">
          <header class="section-head">
            <h2>{{ t('admin.settings.share') }}</h2>
            <p class="hint">{{ t('admin.settings.sharePreviewHint') }}</p>
          </header>
          <AdminLocalizedField v-model="shareTitle" :label="t('admin.settings.shareTitle')" />
          <AdminLocalizedField v-model="shareDescription" :label="t('admin.settings.shareDescription')" multiline />
          <AdminSharePreview :draft="draft" @share-image="draft.shareImage = $event" />
        </section>

        <section class="panel">
          <details class="fold">
            <summary>{{ t('admin.share.advanced') }}</summary>
            <div class="form-grid">
              <div class="field narrow">
                <label for="s-slug">{{ t('admin.settings.slug') }}</label>
                <input id="s-slug" v-model="draft.slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" autocapitalize="off" required @change="draft.slug = slugify(draft.slug)">
                <p class="hint tabular">{{ site }}/{{ draft.slug }}</p>
              </div>
              <label class="check"><input v-model="draft.privacy.allowIndexing" type="checkbox"> {{ t('admin.settings.allowIndexing') }}</label>
              <div class="section-head">
                <h2>{{ t('admin.dashboard.publishTitle') }}</h2>
                <p class="hint">{{ t('admin.dashboard.publishHint') }}</p>
              </div>
              <pre class="cmd">git add content public/uploads
git commit -m "Update invitation"
git push</pre>
              <div class="section-head">
                <h2>{{ t('admin.settings.backup') }}</h2>
                <p class="hint">{{ t('admin.settings.backupHint') }}</p>
              </div>
              <div><a :href="`${base}/backup`" class="btn btn-outline btn-sm" download>{{ t('admin.settings.downloadBackup') }}</a></div>
              <p class="muted small">{{ t('admin.settings.version') }}: {{ config.version || '–' }}<template v-if="config.commit"> ({{ config.commit }})</template></p>
            </div>
          </details>
        </section>
      </template>

      <AdminStepNav form="step-form" :saving="saving" :dirty="dirty" />
    </form>
  </div>
</template>

<style scoped>
.editor { max-width: 56rem; }
.sections { display: flex; flex-direction: column; gap: var(--space-5); }
.narrow { max-width: 22rem; }
/* Fields side by side: the boxes share one line even when a label wraps onto two */
.one-line { align-items: end; }

/* Couple: one card per partner, photo first */
.people { display: grid; gap: var(--space-4); grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); }
.person { display: flex; flex-direction: column; gap: var(--space-4); min-width: 0; padding: var(--space-4); border-radius: var(--radius); background: color-mix(in oklab, var(--c-accent) 6%, var(--c-bg)); }
.person-head { display: flex; align-items: center; gap: var(--space-3); }
.avatar { width: 4.5rem; height: 4.5rem; border-radius: 50%; object-fit: cover; flex: none; box-shadow: 0 0 0 3px var(--c-surface), 0 0 0 4px var(--c-line); }
.avatar.empty { display: grid; place-items: center; background: var(--c-surface); color: var(--c-secondary); font-size: 1.6rem; font-weight: 700; }
.photo-pick { border: 0; padding: 0; margin: 0; min-width: 0; }
.photo-pick legend { padding: 0; margin-bottom: var(--space-2); font-weight: 500; }
.photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(4rem, 1fr)); gap: var(--space-2); max-height: 15rem; overflow-y: auto; padding: 0.75rem 4px; mask: linear-gradient(transparent, #000 0.75rem calc(100% - 0.75rem), transparent); }
.photo-opt { display: grid; place-items: center; aspect-ratio: 1; border-radius: 50%; overflow: hidden; cursor: pointer; background: var(--c-surface); outline: 3px solid transparent; outline-offset: 1px; transition: outline-color 0.15s; }
.photo-opt img { width: 100%; height: 100%; object-fit: cover; }
.photo-opt.none span { font-size: 0.7rem; text-align: center; padding: var(--space-1); }
.photo-opt:has(input:checked) { outline-color: var(--c-secondary); }
.photo-opt:has(input:focus-visible) { outline-color: var(--c-secondary); outline-style: dashed; }

/* Words: each text block with its arrows */
.blocks { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.block { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3); align-items: start; padding: var(--space-3) var(--space-3) var(--space-3) var(--space-1); border: 1px solid var(--c-line-soft); border-radius: var(--radius); }
@media (prefers-reduced-motion: no-preference) { .reorder-move { transition: transform 0.3s var(--ease-in-out); } }
.track { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.music-preview { flex: 1 1 16rem; max-width: 26rem; }

/* Replies */
.status { display: flex; align-items: center; gap: var(--space-2); font-weight: 500; }
.status .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c-muted); }
.status.on .dot { background: var(--c-success); }
.chat-row { display: flex; gap: var(--space-2); }
.chat-row input { flex: 1; min-width: 0; }
/* Fixed width, so the box beside it doesn't jump while the label reads "Loading…" */
.chat-row .btn { min-width: 7.5rem; }
.chats { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-1); }
.chat-pick { width: 100%; justify-content: space-between; gap: var(--space-3); border: 1px solid var(--c-line-soft); }
.chat-pick.on { border-color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 8%, transparent); }
.map-preview { display: block; width: 100%; aspect-ratio: 16 / 9; border: 1px solid var(--c-line); border-radius: var(--radius); }
.gifts { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr)); }
.gift { display: flex; flex-direction: column; gap: var(--space-3); height: 100%; padding: var(--space-3); border: 1px solid var(--c-line-soft); border-radius: var(--radius); }
.gift-thumb { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: var(--radius-sm); background: #fff; border: 1px solid var(--c-line-soft); }
.gift .delete { align-self: flex-start; color: var(--c-danger); }
.gift.add {
  min-height: 14rem; justify-content: center; align-items: center; text-align: center; cursor: pointer;
  border: 2px dashed var(--c-line); color: var(--c-secondary); font-weight: 500; transition: border-color 0.15s, background-color 0.15s;
}
@media (hover: hover) { .gift.add:hover { border-color: var(--c-secondary); background: color-mix(in oklab, var(--c-secondary) 5%, transparent); } }
.gift.add:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
.gift.add.busy { opacity: 0.7; cursor: progress; }
.plus { font-size: 2rem; line-height: 1; }

/* Share */
.guest-links { border-color: color-mix(in oklab, var(--c-secondary) 25%, var(--c-line-soft)); }
.link-maker { display: grid; gap: var(--space-3); grid-template-columns: minmax(0, 1fr) 9rem; }
.link-out { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: color-mix(in oklab, var(--c-accent) 12%, var(--c-surface)); }
.link-out.empty code { color: var(--c-muted); }
.link-out code { flex: 1 1 16rem; min-width: 0; display: flex; white-space: pre; font-size: 0.92rem; }
.link-out code span:first-child { overflow: hidden; text-overflow: ellipsis; }
.cmd { margin: 0; padding: var(--space-3); border-radius: var(--radius-sm); background: var(--c-text); color: var(--c-bg); font-size: 0.85rem; overflow-x: auto; }
</style>
