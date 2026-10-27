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
  // gamma: left/right tilt; beta: forward/back. Forward/back is measured from how the visitor is holding the
  // phone (the first reading, then slowly following it), so lying in bed or standing both start level.
  // Full effect at 20° of tilt.
  let level: number | null = null
  const onTilt = (e: DeviceOrientationEvent) => {
    if (e.gamma === null || e.beta === null) return
    level = level === null ? e.beta : level + (e.beta - level) * 0.02
    target = [clamp(e.gamma / 20), clamp((e.beta - level) / 20)]
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

// Personal links carry the guest's name (?to=…). The page is the same static file for everyone,
// so the name is read in the browser after it loads.
const guestName = ref('')
onMounted(() => {
  const to = route.query.to
  if (typeof to === 'string') guestName.value = to.trim().slice(0, 120)
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
const meta = computed(() => shareMeta(w.value, data.value!.display[loc.value], loc.value, t('hero.invite')))
const names = computed(() => meta.value.names)
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const pageUrl = computed(() => `${siteUrl}${localePath(`/${w.value.slug}`)}`)
const title = computed(() => meta.value.title)
const description = computed(() => meta.value.description)
// Size of the cover photo, when it is one of the gallery photos, so apps can lay out the preview before loading it
const cover = computed(() => data.value!.gallery.find(g => g.url === w.value.coverImage))
const coverType = computed(() => ({ webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', svg: 'image/svg+xml' } as Record<string, string>)[w.value.coverImage.split('.').pop()!.toLowerCase()])

// Event details for search engines (schema.org), from the first to the last item of the schedule
const eventLd = computed(() => {
  const ev = data.value!.events
  const place = ev.find(e => L(e.venue))
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title.value,
    description: description.value,
    startDate: ev[0]?.startUtc ?? data.value!.dateUtc,
    endDate: ev.at(-1)?.endUtc,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: abs(w.value.coverImage),
    url: pageUrl.value,
    inLanguage: loc.value,
    ...(place && { location: { '@type': 'Place', name: L(place.venue), address: L(place.address) || undefined } }),
  }
})

useHead(() => ({
  htmlAttrs: { lang: loc.value },
  link: [
    { rel: 'canonical', href: pageUrl.value },
    // The same invitation in the other language
    { rel: 'alternate', hreflang: 'km', href: `${siteUrl}${switchLocalePath('km')}` },
    { rel: 'alternate', hreflang: 'en', href: `${siteUrl}${switchLocalePath('en')}` },
    { rel: 'alternate', hreflang: 'x-default', href: `${siteUrl}${switchLocalePath('km')}` },
  ],
  // Tints the mobile browser bar to match
  meta: [{ name: 'theme-color', content: w.value.theme.background }],
  // `<` is escaped so text from the admin can never close the script tag
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(eventLd.value).replace(/</g, '\\u003c') }],
}))
useSeoMeta({
  title: () => title.value,
  description: () => description.value,
  ogTitle: () => meta.value.cardTitle,
  ogDescription: () => description.value,
  ogType: 'website',
  ogUrl: () => pageUrl.value,
  ogSiteName: () => names.value,
  ogImage: () => abs(w.value.coverImage),
  ogImageType: () => coverType.value as 'image/webp',
  ogImageWidth: () => cover.value?.width,
  ogImageHeight: () => cover.value?.height,
  ogImageAlt: () => L(cover.value?.alt ?? { km: '', en: '' }) || names.value,
  ogLocale: () => (loc.value === 'km' ? 'km_KH' : 'en_US'),
  ogLocaleAlternate: () => (loc.value === 'km' ? 'en_US' : 'km_KH'),
  twitterCard: 'summary_large_image',
  twitterTitle: () => meta.value.cardTitle,
  twitterDescription: () => description.value,
  twitterImage: () => abs(w.value.coverImage),
  robots: () => (w.value.privacy.allowIndexing ? 'index, follow' : 'noindex, nofollow'),
})
</script>

<template>
  <div ref="page" class="wedding themed" :class="`style-${w.theme.style ?? 'classic'}`" :style="themeStyle">
    <WeddingEnvelope
      v-if="!isPreview"
      :monogram="w.monogram"
      :motif="w.theme.motif"
      :guest-name="guestName"
      @revealing="introDelay = $event"
    />

    <p v-if="w.isSample" class="banner">{{ t('common.sample') }}</p>

    <WeddingPetals v-if="w.theme.motif !== 'none' || floral" />
    <WeddingButterflies v-if="!isPreview" />
    <WeddingNavigation :sections="sections" :music-url="w.musicUrl" :monogram="w.monogram" />

    <main>
      <WeddingHero :data="data!" :intro-delay="introDelay" />
      <WeddingCountdown :date-utc="data!.dateUtc" :timezone="w.timezone" :when="`${data!.display[loc].date} · ${data!.display[loc].time}`" :event-days="data!.events.map(e => e.startUtc)" :ics-url="`/api/public/weddings/${w.slug}/events/${loc === 'en' ? 'all-en' : 'all'}.ics`" />
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
      <WeddingGallery v-if="data!.gallery.length" :images="data!.gallery" :motif="w.theme.motif" :names="names" />
      <WeddingFlorals v-if="floral" class="fl-sprig fl-right" variant="sprig" :seed="1" flip />
      <WeddingRsvpForm :data="data!" :guest-name="guestName" />

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
