<script setup lang="ts">
// The guests' replies: totals, then a list to filter, search, download or tidy up (e.g. test replies)
import { replyTotals, type Reply } from '~~/shared/rsvp'

type Row = Reply & { live: boolean }
const { t, locale } = useI18n()
const { base, id, wedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

const replies = ref<Row[]>([])
const live = ref<'ok' | 'off' | 'failed'>('ok')
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    ;({ replies: replies.value, live: live.value } = await api<{ replies: Row[], live: typeof live.value }>(`${base.value}/replies`))
  } catch {
    // the error toast is shown by api()
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

const totals = computed(() => replyTotals(replies.value))
const filter = ref<'all' | 'yes' | 'no'>('all')
const q = ref('')
const shown = computed(() => {
  const s = q.value.trim().toLowerCase()
  return replies.value.filter(r => (filter.value === 'all' || r.attending === (filter.value === 'yes')) && (!s || r.name.toLowerCase().includes(s)))
})
const count = (f: typeof filter.value) => f === 'all' ? replies.value.length : f === 'yes' ? totals.value.coming : totals.value.notComing
const when = (iso: string) => new Date(iso).toLocaleString(locale.value === 'km' ? 'km-KH' : 'en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

async function remove(r: Row) {
  if (!await confirm(t('admin.replies.deleteConfirm', { name: r.name }), { action: t('common.delete') })) return
  await api(`${base.value}/replies`, { method: 'DELETE', body: { name: r.name } })
  await load()
  push(t('common.saved'))
}

// A spreadsheet of the list as shown. The mark at the start makes Excel read Khmer names correctly.
function download() {
  const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const head = [t('rsvp.name'), t('admin.replies.coming'), t('rsvp.people'), t('rsvp.phone'), t('admin.replies.note'), t('admin.replies.replied')]
  const rows = shown.value.map(r => [r.name, r.attending ? t('common.yes') : t('common.no'), r.guests, r.phone, r.message, when(r.at)])
  const csv = '﻿' + [head, ...rows].map(row => row.map(cell).join(',')).join('\r\n')
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `${wedding.value?.slug ?? 'replies'}-replies.csv` })
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<template>
  <section class="panel form-grid replies">
    <header class="replies-head">
      <div class="section-head">
        <h2>{{ t('admin.replies.title') }}</h2>
        <p class="hint">{{ t('admin.replies.hint') }}</p>
      </div>
      <div class="page-actions">
        <button type="button" class="btn btn-ghost btn-sm" :disabled="loading" @click="load">{{ loading ? t('common.loading') : t('admin.replies.refresh') }}</button>
        <button type="button" class="btn btn-outline btn-sm" :disabled="!shown.length" @click="download">{{ t('admin.replies.download') }}</button>
      </div>
    </header>

    <p v-if="live !== 'ok'" class="note" role="note">{{ t(live === 'off' ? 'admin.replies.liveOff' : 'admin.replies.liveFailed') }}</p>

    <div class="stats">
      <AdminStatCard :label="t('admin.replies.coming')" :value="totals.coming" :hint="t('admin.replies.guestsInAll', { n: totals.guests }, totals.guests)" class="yes" />
      <AdminStatCard :label="t('admin.replies.notComing')" :value="totals.notComing" class="no" />
      <AdminStatCard :label="t('admin.replies.total')" :value="replies.length" />
    </div>

    <template v-if="replies.length">
      <div class="filters">
        <div class="segmented" role="group">
          <button v-for="f in (['all', 'yes', 'no'] as const)" :key="f" type="button" :class="{ on: filter === f }" :aria-pressed="filter === f" @click="filter = f">
            {{ f === 'all' ? t('admin.assets.filterAll') : f === 'yes' ? t('admin.replies.coming') : t('admin.replies.notComing') }}
            <span class="n tabular">{{ count(f) }}</span>
          </button>
        </div>
        <input v-if="replies.length > 5" v-model="q" type="search" class="input search" :placeholder="t('admin.replies.search')" :aria-label="t('admin.replies.search')">
      </div>

      <p v-if="!shown.length" class="muted">{{ t('admin.replies.noMatch') }}</p>
      <ul v-else class="list">
        <li v-for="r in shown" :key="`${r.name}-${r.at}`" class="row">
          <span class="answer" :class="r.attending ? 'yes' : 'no'" aria-hidden="true">{{ r.attending ? '✓' : '✕' }}</span>
          <div class="who">
            <p class="name">
              {{ r.name }}
              <span class="visually-hidden">{{ r.attending ? t('admin.replies.coming') : t('admin.replies.notComing') }}</span>
              <span v-if="r.attending" class="badge responded">{{ t('admin.replies.guestsN', { n: r.guests }, r.guests) }}</span>
              <span v-if="!r.live" class="badge">{{ t('admin.replies.local') }}</span>
            </p>
            <p class="meta muted small">
              <a v-if="r.phone" :href="`tel:${r.phone.replace(/\s/g, '')}`" class="tabular">{{ r.phone }}</a><template v-if="r.phone"> · </template>{{ when(r.at) }}
            </p>
            <p v-if="r.message" class="message">“{{ r.message }}”</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm delete" :aria-label="`${t('common.delete')}: ${r.name}`" @click="remove(r)">{{ t('common.delete') }}</button>
        </li>
      </ul>
    </template>
    <p v-else-if="!loading" class="muted empty">{{ t('admin.replies.none') }}</p>
  </section>
</template>

<style scoped>
.replies-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.note { padding: var(--space-3) var(--space-4); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--c-accent) 12%, var(--c-surface)); font-size: 0.9rem; }
.stats { display: grid; gap: var(--space-3); grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 480px) { .stats { grid-template-columns: 1fr 1fr; } .stats > :last-child { grid-column: 1 / -1; } }
.stats .yes :deep(.value) { color: #2F7A50; }
.stats .no :deep(.value) { color: #B03A40; }
.filters { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3); }
.search { flex: 1 1 14rem; max-width: 22rem; }
.list { list-style: none; margin: 0; padding: 0; border: 1px solid var(--c-line-soft); border-radius: var(--radius); }
.row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: var(--space-3); padding: var(--space-3) var(--space-4); }
.row + .row { border-top: 1px solid var(--c-line-soft); }
.answer { display: grid; place-items: center; width: 2rem; height: 2rem; margin-top: 2px; border-radius: 50%; font-size: 0.9rem; font-weight: 700; color: #fff; }
.answer.yes { background: #2F7A50; }
.answer.no { background: #B03A40; }
.name { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-1) var(--space-2); font-weight: 600; overflow-wrap: anywhere; }
.meta a { color: inherit; }
.message { margin-top: var(--space-1); font-style: italic; overflow-wrap: anywhere; }
.delete { color: var(--c-danger); }
.empty { padding-block: var(--space-3); }
</style>
