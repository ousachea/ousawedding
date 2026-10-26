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
  <div class="wedding themed" :style="themeStyle">
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
      <WeddingEventTimeline :data="data!" />

      <section v-for="b in textBlocks" :id="b.key" :key="b.key" class="story" :aria-labelledby="`${b.key}-title`">
        <div class="container story-inner">
          <span v-if="b.key === 'story'" v-reveal class="section-icon"><WeddingIcon name="heart" /></span>
          <h2 v-reveal :id="`${b.key}-title`" class="section-title">{{ t(blockTitle[b.key]) }}</h2>
          <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />
          <p v-reveal="200" class="story-text">{{ b.text }}</p>
        </div>
      </section>

      <WeddingGallery v-if="data!.gallery.length" :images="data!.gallery" :motif="w.theme.motif" />
      <WeddingRsvpForm :data="data!" :token="token" :invite="invite" :invite-state="inviteState" @saved="onSaved" />

    </main>

    <WeddingFooter :data="data!" />
  </div>
</template>

<style scoped>
.wedding { background: var(--c-bg); color: var(--c-text); min-height: 100dvh; }
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
</style>
