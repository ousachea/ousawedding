<script setup lang="ts">
// How the invitation link looks when shared in a chat app and in Google, from the unsaved settings.
// Uses shareMeta, the same text the invitation page puts in its share tags.
const props = defineProps<{ draft: Omit<Wedding, 'id' | 'createdAt' | 'updatedAt' | 'isSample'> }>()
const { t } = useI18n()
const { $i18n } = useNuxtApp()
const siteUrl = useRuntimeConfig().public.siteUrl

const lang = ref<Locale>(props.draft.defaultLocale)
// Only the admin's own language is loaded; the fallback title is needed in both
const ready = ref(false)
onMounted(async () => {
  await Promise.all((['km', 'en'] as const).map(l => $i18n.loadLocaleMessages(l)))
  ready.value = true
})

const host = computed(() => {
  try { return new URL(siteUrl || location.origin).host } catch { return location.host }
})
const path = computed(() => [lang.value === 'en' ? 'en' : '', props.draft.slug].filter(Boolean))

const meta = computed(() => {
  if (!ready.value) return null
  try {
    const when = weddingDates(props.draft.date, props.draft.rsvp.deadline, props.draft.timezone).display[lang.value]
    return shareMeta(props.draft, when, lang.value, t('hero.invite', {}, { locale: lang.value }))
  } catch {
    // A half-typed date can't be formatted yet
    return null
  }
})
// Rough limits before Google cuts the text off
const LIMITS = { title: 60, description: 160 }

// Link-preview crop: click the photo to choose the point kept in view. The cover is cropped here to 1200×630
// and saved as its own image, since chat apps otherwise crop the middle of the whole cover themselves.
const emit = defineEmits<{ shareImage: [value: Wedding['shareImage']] }>()
const { base } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const sharePosition = computed(() => (props.draft.shareImage?.cover === props.draft.coverImage ? props.draft.shareImage.position : '50% 50%'))
const cropping = ref(false)
async function setSharePosition(event: MouseEvent) {
  if (cropping.value) return
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const clamp = (v: number) => Math.min(Math.max(v, 0), 1)
  const [px, py] = [clamp((event.clientX - box.left) / box.width), clamp((event.clientY - box.top) / box.height)]
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`
  cropping.value = true
  try {
    const img = new Image()
    img.src = props.draft.coverImage
    await img.decode()
    // The largest 1200:630 area of the photo, placed like CSS object-position, so it matches this preview
    const ratio = 1200 / 630
    const [w, h] = [img.naturalWidth, img.naturalHeight]
    const [cw, ch] = w / h > ratio ? [h * ratio, h] : [w, w / ratio]
    const canvas = Object.assign(document.createElement('canvas'), { width: 1200, height: 630 })
    canvas.getContext('2d')!.drawImage(img, px * (w - cw), py * (h - ch), cw, ch, 0, 0, 1200, 630)
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86))
    if (!blob) throw new Error('encode failed')
    const form = new FormData()
    form.append('image', blob, 'share.jpg')
    form.append('cover', props.draft.coverImage)
    form.append('position', `${pct(px)} ${pct(py)}`)
    const updated = await api<Wedding>(`${base.value}/share-image`, { method: 'POST', body: form })
    emit('shareImage', updated.shareImage)
    push(t('common.saved'))
  } catch (e) {
    // api() already shows its own errors; this covers a photo that can't be loaded or drawn
    if (!(e as { statusCode?: number }).statusCode) push(t('common.error'), 'error')
  } finally {
    cropping.value = false
  }
}
</script>

<template>
  <div class="share-preview">
    <div class="head">
      <h3>{{ t('admin.settings.sharePreview') }}</h3>
      <div class="langs">
        <button v-for="l in (['km', 'en'] as const)" :key="l" type="button" class="btn btn-sm" :class="lang === l ? 'btn-primary' : 'btn-ghost'" :aria-pressed="lang === l" @click="lang = l">
          {{ l === 'km' ? t('common.khmer') : t('common.english') }}
        </button>
      </div>
    </div>
    <p class="muted small">{{ t('admin.settings.sharePreviewHint') }}</p>

    <template v-if="meta">
      <p class="where">{{ t('admin.settings.previewChat') }}</p>
      <div class="card" :lang="lang">
        <button v-if="draft.coverImage" type="button" class="crop" :class="{ busy: cropping }" :aria-label="t('admin.settings.shareImageHint')" @click="setSharePosition">
          <img :src="draft.coverImage" :style="{ objectPosition: sharePosition }" alt="">
          <span class="focus" :style="{ left: sharePosition.split(' ')[0], top: sharePosition.split(' ')[1] }" aria-hidden="true" />
        </button>
        <div class="card-text">
          <span class="host">{{ host }}</span>
          <strong class="card-title">{{ meta.cardTitle }}</strong>
          <span class="desc">{{ meta.description }}</span>
        </div>
      </div>

      <p v-if="draft.coverImage" class="muted small">{{ t('admin.settings.shareImageHint') }}</p>

      <p class="where">{{ t('admin.settings.previewGoogle') }}</p>
      <div class="serp" :class="{ hidden: !draft.privacy.allowIndexing }" :lang="lang">
        <div class="site">
          <img src="/favicon.svg" alt="" width="18" height="18">
          <span>
            <span class="site-name">{{ meta.names }}</span>
            <span class="crumbs">https://{{ host }}<template v-for="p in path" :key="p"> › {{ p }}</template></span>
          </span>
        </div>
        <span class="serp-title">{{ meta.title }}</span>
        <span class="desc">{{ meta.description }}</span>
      </div>
      <p v-if="!draft.privacy.allowIndexing" class="muted small">{{ t('admin.settings.previewHidden') }}</p>
      <p class="muted small tabular">
        {{ t('admin.settings.previewCounts', { title: meta.title.length, description: meta.description.length }) }}
        <template v-if="meta.title.length > LIMITS.title || meta.description.length > LIMITS.description"> · {{ t('admin.settings.previewLong') }}</template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.share-preview { display: flex; flex-direction: column; gap: var(--space-2); }
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); }
.head h3 { font-size: 1.05rem; font-weight: 600; }
.langs { display: flex; gap: var(--space-1); }
.where { margin-top: var(--space-2); font-size: 0.8rem; font-weight: 500; color: var(--c-muted); }

/* A generic link card: wide photo on top, as most chat apps crop it */
.card { max-width: 26rem; overflow: hidden; border: 1px solid var(--c-line-soft); border-radius: var(--radius); background: var(--c-bg); }
.card img { display: block; width: 100%; aspect-ratio: 1200 / 630; object-fit: cover; }
/* Click the photo to choose the point kept in view */
.crop { position: relative; display: block; width: 100%; padding: 0; border: 0; background: none; cursor: crosshair; }
.crop.busy { opacity: 0.6; cursor: progress; }
.focus { position: absolute; width: 18px; height: 18px; translate: -50% -50%; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4); pointer-events: none; }
.card-text { display: flex; flex-direction: column; gap: 2px; padding: var(--space-2) var(--space-3) var(--space-3); }
.host { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--c-muted); }
.card-title { font-size: 0.95rem; line-height: 1.35; }

/* A search result */
.serp { display: flex; flex-direction: column; gap: 4px; max-width: 38rem; padding: var(--space-3); border: 1px solid var(--c-line-soft); border-radius: var(--radius); background: var(--c-bg); }
.serp.hidden { opacity: 0.55; border-style: dashed; }
.site { display: flex; align-items: center; gap: var(--space-2); }
.site img { padding: 3px; border-radius: 50%; background: var(--c-surface); outline: 1px solid var(--c-line-soft); }
.site > span { display: flex; flex-direction: column; line-height: 1.25; }
.site-name { font-size: 0.85rem; }
.crumbs { font-size: 0.75rem; color: var(--c-muted); }
.serp-title { font-size: 1.15rem; line-height: 1.3; color: var(--c-accent-ink); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

.desc { font-size: 0.85rem; line-height: 1.45; color: var(--c-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
