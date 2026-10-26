<script setup lang="ts">
const route = useRoute()
const { t, locale } = useI18n()
const L = useLocalized()
const slug = route.params.slug as string

const { data, error } = await useFetch<PublicWedding>(`/api/public/weddings/${encodeURIComponent(slug)}`, {
  key: `wedding-${slug}`,
})
if (error.value || !data.value) {
  throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'Wedding not found', fatal: true })
}
const w = computed(() => data.value!.wedding)
const loc = computed(() => locale.value as Locale)
const floral = computed(() => w.value.theme.style === 'floral')

// Floral style: the flowers lean as the phone tilts (gyroscope), via --tilt-x / --tilt-y on the page (-1..1).
// iOS only reports tilt after the visitor allows it, and the request must come from a tap, so it is asked
// on the first tap (usually "Open invitation" on the envelope). Smoothed so the flowers drift, not jitter.
const page = ref<HTMLElement>()
let stopTilt = () => {}
onMounted(() => {
  if (!floral.value || !('DeviceOrientationEvent' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  let target = [0, 0]
  const now = [0, 0]
  let frame = 0
  const step = () => {
    for (const i of [0, 1]) now[i]! += (target[i]! - now[i]!) * 0.1
    page.value?.style.setProperty('--tilt-x', now[0]!.toFixed(3))
    page.value?.style.setProperty('--tilt-y', now[1]!.toFixed(3))
    frame = Math.abs(target[0]! - now[0]!) + Math.abs(target[1]! - now[1]!) > 0.002 ? requestAnimationFrame(step) : 0
  }
  // gamma: left/right tilt; beta: forward/back, about 45° when a phone is held to read
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return
    target = [clamp(e.gamma / 30), clamp((e.beta - 45) / 30)]
    frame ||= requestAnimationFrame(step)
  }
  const start = () => addEventListener('deviceorientation', onTilt)
  const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission
  const askOnTap = () => ask!().then(s => s === 'granted' && start()).catch(() => {})
  if (ask) addEventListener('click', askOnTap, { once: true })
  else start()
  stopTilt = () => {
    removeEventListener('deviceorientation', onTilt)
    removeEventListener('click', askOnTap)
    cancelAnimationFrame(frame)
  }
})
onBeforeUnmount(() => stopTilt())

// Personal invitations are resolved in the browser only, so guest names never reach server HTML or caches
const token = typeof route.query.invite === 'string' ? route.query.invite : undefined
const invite = ref<ResolvedInvitation | null>(null)
const inviteState = ref<'none' | 'loading' | 'valid' | 'invalid'>(token ? 'loading' : 'none')

onMounted(async () => {
  if (!token) return
  try {
    invite.value = await $fetch<ResolvedInvitation>('/api/public/invitation', { method: 'POST', body: { slug, token } })
    inviteState.value = 'valid'
  } catch {
    inviteState.value = 'invalid'
  }
})

const introDelay = ref<number | null>(null)

// Inside the admin settings preview: show unsaved edits sent by the parent page (same origin only)
const isPreview = route.query.preview === '1'
let shownSection = ''
let saved: PublicWedding | null = null
function onPreviewMessage(e: MessageEvent) {
  if (e.origin !== location.origin || e.source !== window.parent || e.data?.type !== 'wedding-preview') return
  const { draft, section } = e.data as { draft: PublicWedding['wedding'], section: string }
  saved ??= data.value!
  try {
    const dates = weddingDates(draft.date, draft.rsvp.deadline, draft.timezone)
    // The schedule follows the big day, as it will once saved
    const shift = Date.parse(dates.dateUtc) - Date.parse(saved.dateUtc)
    const events = saved.events.map((e) => {
      const start = new Date(Date.parse(e.startUtc) + shift)
      const end = new Date(Date.parse(e.endUtc) + shift)
      return { ...e, startUtc: start.toISOString(), endUtc: end.toISOString(), display: eventDisplay(start, end, draft.timezone) }
    })
    data.value = { ...saved, ...dates, events, wedding: { ...saved.wedding, ...draft } }
  } catch {
    // A half-typed date can't be formatted yet; keep the last good preview
  }
  // Scroll once per section, after the edit renders (the story section only exists once it has text)
  nextTick(() => {
    const el = section !== shownSection && document.getElementById(section)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      shownSection = section
    }
  })
}
onMounted(() => { if (isPreview) addEventListener('message', onPreviewMessage) })
onBeforeUnmount(() => removeEventListener('message', onPreviewMessage))

function onSaved(rsvp: NonNullable<ResolvedInvitation['rsvp']>) {
  if (invite.value) invite.value = { ...invite.value, rsvp, canEdit: w.value.rsvp.allowUpdates }
}

const themeStyle = computed(() => {
  const th = w.value.theme
  return {
    '--c-bg': th.background,
    '--c-accent': th.accent,
    '--c-secondary': th.secondary,
    '--c-tertiary': th.tertiary,
    '--c-text': th.text,
    '--font-heading': th.headingFont === 'sans' ? 'var(--font-sans)' : 'var(--font-serif)',
  }
})

// Story, thank-you and apology, in the order chosen in the admin; empty ones are left out
const blockTitle = { story: 'story.title', thanks: 'thanks.title', apology: 'thanks.apologyTitle' } as const
const textBlocks = computed(() => (w.value.textOrder ?? TEXT_BLOCKS)
  .map(key => ({ key, text: L({ km: w.value.content.km[key], en: w.value.content.en[key] }) }))
  .filter(b => b.text))

const sections = computed(() => [
  { id: 'schedule', label: t('nav.schedule') },
  ...(L({ km: w.value.content.km.story, en: w.value.content.en.story }) ? [{ id: 'story', label: t('nav.story') }] : []),
  ...(data.value!.gallery.length ? [{ id: 'gallery', label: t('nav.gallery') }] : []),
  { id: 'rsvp', label: t('nav.rsvp') },
])

// Share previews and search settings. Uses only public wedding fields, never guest data.
const siteUrl = useRuntimeConfig().public.siteUrl || useRequestURL().origin
const abs = (u: string) => (!u ? undefined : u.startsWith('http') ? u : `${siteUrl}${u}`)
const share = computed(() => w.value.share[loc.value])
const names = computed(() => `${w.value.names[loc.value].partner1} & ${w.value.names[loc.value].partner2}`)
const localePath = useLocalePath()
useHead(() => ({
  htmlAttrs: { lang: loc.value },
  link: [{ rel: 'canonical', href: `${siteUrl}${localePath(`/${w.value.slug}`)}` }],
  // Tints the mobile browser bar to match
  meta: [{ name: 'theme-color', content: w.value.theme.background }],
}))
useSeoMeta({
  title: () => share.value.title || `${names.value} | ${t('hero.invite')}`,
  description: () => share.value.description || `${t('hero.invite')} · ${data.value!.display[loc.value].date}`,
  ogTitle: () => share.value.title || names.value,
  ogDescription: () => share.value.description || data.value!.display[loc.value].date,
  ogType: 'website',
  ogImage: () => abs(w.value.coverImage),
  ogLocale: () => (loc.value === 'km' ? 'km_KH' : 'en_US'),
  twitterCard: 'summary_large_image',
  robots: () => (w.value.privacy.allowIndexing && !data.value!.preview ? 'index, follow' : 'noindex, nofollow'),
})
</script>

<template>
  <div ref="page" class="wedding themed" :class="`style-${w.theme.style ?? 'classic'}`" :style="themeStyle">
    <WeddingEnvelope
      v-if="!isPreview"
      :monogram="w.monogram"
      :motif="w.theme.motif"
      :guest-name="invite?.guestName"
      @revealing="introDelay = $event"
    />

    <p v-if="data!.preview" class="banner preview">{{ t('admin.invitations.unpublished') }}</p>
    <p v-if="w.isSample" class="banner">{{ t('common.sample') }}</p>

    <WeddingNavigation :sections="sections" :music-url="w.musicUrl" :monogram="w.monogram" />

    <main>
      <WeddingHero :data="data!" :intro-delay="introDelay" />
      <WeddingCountdown :date-utc="data!.dateUtc" :timezone="w.timezone" :when="`${data!.display[loc].date} · ${data!.display[loc].time}`" :event-days="data!.events.map(e => e.startUtc)" :ics-url="`/api/public/weddings/${w.slug}/events/all.ics?lang=${loc}`" />
      <WeddingFlorals v-if="floral" class="fl-sprig" variant="sprig" :seed="0" />
      <WeddingEventTimeline :data="data!" />
      <WeddingFlorals v-if="floral" class="fl-divider" :seed="1" flip />

      <section v-for="b in textBlocks" :id="b.key" :key="b.key" class="story" :aria-labelledby="`${b.key}-title`">
        <div class="container story-inner">
          <span v-if="b.key === 'story'" v-reveal class="section-icon"><WeddingIcon name="heart" /></span>
          <h2 v-reveal :id="`${b.key}-title`" class="section-title">{{ t(blockTitle[b.key]) }}</h2>
          <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />
          <p v-reveal="200" class="story-text">{{ b.text }}</p>
        </div>
      </section>
      <WeddingFlorals v-if="floral && textBlocks.length" class="fl-sprig" variant="sprig" :seed="2" />

      <WeddingFlorals v-if="floral" class="fl-garland" variant="garland" />
      <WeddingGallery v-if="data!.gallery.length" :images="data!.gallery" :motif="w.theme.motif" />
      <WeddingFlorals v-if="floral" class="fl-sprig fl-right" variant="sprig" :seed="1" flip />
      <WeddingRsvpForm :data="data!" :token="token" :invite="invite" :invite-state="inviteState" @saved="onSaved" />

    </main>

    <div v-if="floral" class="fl-bottom" aria-hidden="true">
      <WeddingFlorals :seed="1" />
      <WeddingFlorals flip />
    </div>
    <WeddingFooter :data="data!" />
  </div>
</template>

<style scoped>
.wedding { background: var(--paper), var(--c-bg); color: var(--c-text); min-height: 100dvh; }
.banner {
  padding: 0.5rem 1rem; text-align: center; font-size: 0.85rem;
  background: color-mix(in srgb, var(--c-accent) 22%, var(--c-bg)); color: var(--c-text);
}
.banner.preview { background: var(--c-tertiary); color: #fff; }
.story { padding-block: var(--space-8); }
.story-inner { max-width: 40rem; text-align: center; }
.section-title { font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.story-text { margin-top: var(--space-5); font-family: var(--font-serif); font-size: 1.3rem; white-space: pre-line; }
:lang(km) .story-text { font-size: 1.1rem; }
.story + .story { padding-top: 0; }
.fl-divider { width: min(58%, 320px); margin: calc(-1 * var(--space-6)) 0 0 auto; }
.fl-sprig { width: min(44%, 220px); margin: calc(-1 * var(--space-5)) auto calc(-1 * var(--space-5)) 0; }
.fl-sprig.fl-right { margin-inline: auto 0; }
.fl-garland { width: min(92%, 520px); margin: var(--space-2) auto; }
.fl-bottom { display: flex; justify-content: space-between; align-items: flex-end; gap: 20%; margin-bottom: calc(-1 * var(--space-6)); }
.fl-bottom > * { width: min(40%, 260px); }
</style>
