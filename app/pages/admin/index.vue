<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const localePath = useLocalePath()
const { base, id, wedding } = useCurrentWedding()
const api = useAdminApi()

const guests = ref<Guest[]>([])
const events = ref<WeddingEvent[]>([])
const photos = ref<GalleryImage[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    ;[guests.value, events.value, photos.value] = await Promise.all([
      api<{ guests: Guest[] }>(`${base.value}/guests`).then(r => r.guests.filter(g => !g.archived)),
      api<WeddingEvent[]>(`${base.value}/events`),
      api<GalleryImage[]>(`${base.value}/gallery`),
    ])
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

const households = computed(() => new Set(guests.value.map(g => g.householdId || g.id)).size)
const seats = computed(() => guests.value.reduce((n, g) => n + g.maxAttendees, 0))
const daysLeft = computed(() => wedding.value ? Math.max(0, Math.ceil((zonedTimeToUtc(wedding.value.date, wedding.value.timezone).getTime() - Date.now()) / 86_400_000)) : 0)
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.dashboard') }}</h1>
    </div>

    <div class="stats">
      <AdminStatCard :label="t('admin.dashboard.daysLeft')" :value="daysLeft" />
      <AdminStatCard :label="t('admin.dashboard.guests')" :value="guests.length" :hint="t('admin.dashboard.guestsHint', { n: seats })" />
      <AdminStatCard :label="t('admin.dashboard.households')" :value="households" />
      <AdminStatCard :label="t('admin.nav.schedule')" :value="events.length" />
      <AdminStatCard :label="t('admin.nav.gallery')" :value="photos.length" />
    </div>

    <div class="two">
      <!-- The admin saves to files on this computer; the live site is rebuilt from them when they are pushed -->
      <section class="panel">
        <h2>{{ t('admin.dashboard.publishTitle') }}</h2>
        <p>{{ t('admin.dashboard.publishHint') }}</p>
        <pre class="cmd">git add content public/uploads
git commit -m "Update invitation"
git push</pre>
      </section>
      <section class="panel">
        <h2>{{ t('admin.dashboard.repliesTitle') }}</h2>
        <p>{{ t('admin.dashboard.repliesHint') }}</p>
        <p v-if="wedding?.rsvp.formUrl"><a :href="wedding.rsvp.formUrl" target="_blank" rel="noopener" class="btn btn-outline btn-sm">{{ t('admin.dashboard.openForm') }} ↗</a></p>
        <p v-else><NuxtLink :to="localePath('/admin/settings')" class="btn btn-primary btn-sm">{{ t('admin.dashboard.addForm') }}</NuxtLink></p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); }
.two { display: grid; gap: var(--space-4); align-items: start; }
@media (min-width: 900px) { .two { grid-template-columns: 1fr 1fr; } }
.panel { display: flex; flex-direction: column; gap: var(--space-3); }
.panel h2 { font-size: 1.2rem; }
.cmd { margin: 0; padding: var(--space-3); border-radius: var(--radius-sm); background: var(--c-text); color: var(--c-bg); font-size: 0.85rem; overflow-x: auto; }
</style>
