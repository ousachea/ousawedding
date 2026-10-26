<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, id } = useCurrentWedding()
const api = useAdminApi()

type GuestRow = Guest & { rsvp: (Pick<Rsvp, 'attending' | 'count' | 'updatedAt' | 'message' | 'source'>) | null }
const stats = ref<WeddingStats | null>(null)
const recent = ref<Array<{ name: string, attending: boolean, count: number, message: string, updatedAt: string, general: boolean }>>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const [s, g] = await Promise.all([
      api<WeddingStats>(`${base.value}/stats`),
      api<{ guests: GuestRow[], general: Rsvp[] }>(`${base.value}/guests`),
    ])
    stats.value = s
    recent.value = [
      ...g.guests.filter(x => x.rsvp && !x.archived).map(x => ({ name: x.name, attending: x.rsvp!.attending, count: x.rsvp!.count, message: x.rsvp!.message, updatedAt: x.rsvp!.updatedAt, general: false })),
      ...g.general.map(r => ({ name: r.name, attending: r.attending, count: r.count, message: r.message, updatedAt: r.updatedAt, general: true })),
    ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8)
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })
const fmt = (iso: string) => new Date(iso).toLocaleString()
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.dashboard') }}</h1>
      <button type="button" class="btn btn-ghost btn-sm" :disabled="loading" @click="load">↻ {{ t('common.retry') }}</button>
    </div>

    <p v-if="loading && !stats" class="muted">{{ t('common.loading') }}</p>
    <template v-else-if="stats">
      <div class="stats">
        <AdminStatCard :label="t('admin.dashboard.guests')" :value="stats.guests" :hint="t('admin.dashboard.guestsHint', { n: stats.invitedPeople })" />
        <AdminStatCard :label="t('admin.dashboard.households')" :value="stats.households" />
        <AdminStatCard :label="t('admin.dashboard.attending')" :value="stats.attendingPeople" :hint="t('admin.dashboard.attendingHint', { n: stats.attendingResponses })" />
        <AdminStatCard :label="t('admin.dashboard.declined')" :value="stats.declined" />
        <AdminStatCard :label="t('admin.dashboard.pending')" :value="stats.pending" />
        <AdminStatCard :label="t('admin.dashboard.viewed')" :value="`${stats.viewed} / ${stats.invitations}`" />
        <AdminStatCard :label="t('admin.dashboard.rate')" :value="`${stats.responseRate}%`" />
      </div>

      <div class="two">
        <AdminRsvpChart :attending="stats.attendingResponses" :pending="stats.pending" :declined="stats.declined" />
        <section class="panel">
          <h2>{{ t('admin.dashboard.recent') }}</h2>
          <p v-if="!recent.length" class="muted">{{ t('admin.dashboard.noReplies') }}</p>
          <ul v-else class="recent">
            <li v-for="r in recent" :key="r.name + r.updatedAt">
              <div class="recent-top">
                <strong>{{ r.name }}</strong>
                <span class="badge" :class="r.attending ? 'attending' : 'declined'">
                  {{ r.attending ? `${t('admin.guests.statuses.attending')} · ${r.count}` : t('admin.guests.statuses.declined') }}
                </span>
              </div>
              <p v-if="r.message" class="msg">“{{ r.message }}”</p>
              <p class="muted small">{{ fmt(r.updatedAt) }}<template v-if="r.general"> · {{ t('admin.dashboard.general') }}</template></p>
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); }
.two { display: grid; gap: var(--space-4); align-items: start; }
@media (min-width: 900px) { .two { grid-template-columns: 1fr 1.2fr; } }
.recent { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
.recent li { padding: var(--space-3) 0; border-bottom: 1px solid var(--c-line-soft); }
.recent li:last-child { border-bottom: 0; }
.recent-top { display: flex; justify-content: space-between; gap: var(--space-2); align-items: center; }
.msg { font-style: italic; margin-top: 2px; }
</style>
