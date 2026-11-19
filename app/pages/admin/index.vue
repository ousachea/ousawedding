<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { base, id, wedding } = useCurrentWedding()
const { steps } = useAdminSteps()
const api = useAdminApi()

const events = ref<WeddingEvent[]>([])
const photos = ref<GalleryImage[]>([])
async function load() {
  ;[events.value, photos.value] = await Promise.all([
    api<WeddingEvent[]>(`${base.value}/events`),
    api<GalleryImage[]>(`${base.value}/gallery`),
  ])
}
watch(id, load, { immediate: true })

const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
const daysLeft = computed(() => wedding.value ? Math.max(0, Math.ceil((zonedTimeToUtc(wedding.value.date, wedding.value.timezone).getTime() - Date.now()) / 86_400_000)) : 0)

// What each step holds so far; `done` marks the steps the invitation needs before it is shared
const status = computed(() => {
  const w = wedding.value
  if (!w) return {}
  const n = w.names.en
  return {
    couple: { done: !!(n.partner1 && n.partner2), text: `${n.partner1} & ${n.partner2}, ${fmt(w.date)}` },
    schedule: { done: events.value.length > 0, text: t('admin.overview.items', events.value.length) },
    photos: { done: photos.value.length > 0, text: t('admin.overview.photos', photos.value.length) },
    words: { done: !!(w.content.en.message || w.content.km.message), text: w.musicUrl ? t('admin.overview.withMusic') : t('admin.overview.noMusic') },
    look: { done: true, text: t(`admin.settings.styles.${w.theme.style ?? 'classic'}`) },
    replies: { done: true, text: t('admin.overview.replyBy', { date: fmt(w.rsvp.deadline) }) },
    share: { done: true, text: `/${w.slug}` },
  } as Record<string, { done: boolean, text: string }>
})
const nextStep = computed(() => steps.find(s => !status.value[s.key]?.done) ?? null)
</script>

<template>
  <div v-if="wedding" class="admin-page">
    <header class="hello">
      <h1>{{ t('admin.overview.title') }}</h1>
      <p class="lead">{{ t('admin.overview.countdown', { n: daysLeft, date: fmt(wedding.date) }, daysLeft) }}</p>
      <div class="hello-actions">
        <NuxtLink :to="localePath((nextStep ?? steps[0]).to)" class="btn btn-primary">
          {{ nextStep ? t('admin.overview.continue', { step: t(`admin.steps.${nextStep.key}.title`) }) : t('admin.overview.review') }}
        </NuxtLink>
        <a :href="localePath(`/${wedding.slug}`)" target="wedding-invitation" class="btn btn-ghost">{{ t('admin.nav.viewSite') }} ↗</a>
      </div>
    </header>

    <ol class="checklist">
      <li v-for="(s, i) in steps" :key="s.key">
        <NuxtLink :to="localePath(s.to)" class="item" :class="{ done: status[s.key]?.done }">
          <span class="mark" aria-hidden="true">
            <svg v-if="status[s.key]?.done" viewBox="0 0 16 16" width="14" height="14"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="item-text">
            <span class="item-title">{{ t(`admin.steps.${s.key}.title`) }}</span>
            <span class="item-status">{{ status[s.key]?.text }}</span>
          </span>
          <span class="visually-hidden">{{ status[s.key]?.done ? t('admin.overview.done') : t('admin.overview.todo') }}</span>
          <span class="edit">{{ t('admin.overview.edit') }}</span>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.hello { display: flex; flex-direction: column; gap: var(--space-2); max-width: 40rem; }
.hello h1 { font-family: var(--font-serif); font-size: clamp(2rem, 5vw, 2.6rem); line-height: 1.1; color: var(--c-secondary); }
.lead { color: var(--c-muted); font-size: 1.05rem; }
.hello-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }

.checklist { list-style: none; margin: 0; padding: 0; max-width: 44rem; background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius); }
.checklist li + li { border-top: 1px solid var(--c-line-soft); }
.item { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4); text-decoration: none; color: var(--c-text); }
.item:hover { background: color-mix(in srgb, var(--c-secondary) 4%, transparent); }
.item:focus-visible { outline: 2px solid var(--c-secondary); outline-offset: -2px; }
.checklist li:first-child .item { border-radius: var(--radius) var(--radius) 0 0; }
.checklist li:last-child .item { border-radius: 0 0 var(--radius) var(--radius); }
.mark { flex: none; display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid var(--c-accent); color: var(--c-accent-ink); font-size: 0.85rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.item.done .mark { background: var(--c-secondary); border-color: var(--c-secondary); color: var(--c-on-secondary); }
.item-text { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.item-title { font-weight: 600; }
.item-status { color: var(--c-muted); font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.edit { flex: none; font-size: 0.88rem; color: var(--c-secondary); font-weight: 500; }
</style>
