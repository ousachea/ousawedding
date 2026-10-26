<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { base, id, wedding, loadWedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

const events = ref<WeddingEvent[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    events.value = await api<WeddingEvent[]>(`${base.value}/events`)
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

const blank = () => ({
  title: { km: '', en: '' }, description: { km: '', en: '' }, venue: { km: '', en: '' }, address: { km: '', en: '' },
  start: wedding.value?.date ?? '', end: wedding.value?.date ?? '', mapUrl: '', imageUrl: '',
})
type Draft = ReturnType<typeof blank>
const editing = ref<{ id: string | null, data: Draft } | null>(null)
const saving = ref(false)
const endError = computed(() => !!editing.value && editing.value.data.end < editing.value.data.start)

const openNew = () => (editing.value = { id: null, data: blank() })
const openEdit = (e: WeddingEvent) => (editing.value = {
  id: e.id,
  data: structuredClone({ title: e.title, description: e.description, venue: e.venue, address: e.address, start: e.start, end: e.end, mapUrl: e.mapUrl, imageUrl: e.imageUrl }),
})

async function save() {
  if (!editing.value || saving.value || endError.value) return
  saving.value = true
  try {
    const { id: eventId, data } = editing.value
    await api(eventId ? `${base.value}/events/${eventId}` : `${base.value}/events`, { method: eventId ? 'PATCH' : 'POST', body: data })
    editing.value = null
    push(t('common.saved'))
    await load()
  } finally {
    saving.value = false
  }
}

async function remove(e: WeddingEvent) {
  const name = e.title[locale.value as Locale] || e.title.en
  if (!await confirm(t('admin.events.deleteConfirm', { name }), { action: t('common.delete') })) return
  await api(`${base.value}/events/${e.id}`, { method: 'DELETE' })
  push(t('common.saved'))
  await load()
}

async function move(index: number, step: number) {
  const list = [...events.value]
  const [item] = list.splice(index, 1)
  list.splice(index + step, 0, item!)
  events.value = list
  await api(`${base.value}/events/reorder`, { method: 'POST', body: { ids: list.map(e => e.id) } }).catch(load)
}

// Dress code and guest information live on the wedding but belong with the schedule
const info = ref<{ dressCode: Localized, instructions: Localized } | null>(null)
watch(wedding, (w) => {
  if (w) info.value = {
    dressCode: { km: w.content.km.dressCode, en: w.content.en.dressCode },
    instructions: { km: w.content.km.instructions, en: w.content.en.instructions },
  }
}, { immediate: true })
async function saveInfo() {
  const w = wedding.value!
  const content = {
    km: { ...w.content.km, dressCode: info.value!.dressCode.km, instructions: info.value!.instructions.km },
    en: { ...w.content.en, dressCode: info.value!.dressCode.en, instructions: info.value!.instructions.en },
  }
  await api(base.value, { method: 'PATCH', body: { content } })
  await loadWedding()
  push(t('common.saved'))
}
const L = useLocalized()
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.events') }}</h1>
      <div class="page-actions">
        <a v-if="wedding" :href="`${localePath(`/wedding/${wedding.slug}`)}#schedule`" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">{{ t('admin.invitations.preview') }} ↗</a>
        <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.events.add') }}</button>
      </div>
    </div>
    <p v-if="wedding" class="muted small">{{ t('admin.events.timezone', { tz: wedding.timezone }) }}</p>

    <p v-if="loading && !events.length" class="muted">{{ t('common.loading') }}</p>
    <div v-else-if="!events.length" class="panel empty-state">
      <p>{{ t('admin.events.empty') }}</p>
      <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.events.add') }}</button>
    </div>
    <ol v-else class="event-list">
      <li v-for="(e, i) in events" :key="e.id" class="panel event">
        <div class="order">
          <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" :aria-label="t('admin.events.moveUp')" @click="move(i, -1)">↑</button>
          <button type="button" class="btn btn-ghost btn-sm" :disabled="i === events.length - 1" :aria-label="t('admin.events.moveDown')" @click="move(i, 1)">↓</button>
        </div>
        <div class="body">
          <p class="when tabular">{{ e.start.replace('T', ' ') }} – {{ e.end.slice(11) }}</p>
          <h2>{{ L(e.title) }}</h2>
          <p class="muted small">{{ L(e.venue) }}<template v-if="L(e.address)"> · {{ L(e.address) }}</template></p>
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(e)">{{ t('common.edit') }}</button>
          <button type="button" class="btn btn-danger btn-sm" @click="remove(e)">{{ t('common.delete') }}</button>
        </div>
      </li>
    </ol>

    <form v-if="info" class="panel form-grid" @submit.prevent="saveInfo">
      <h2>{{ t('admin.settings.dressCode') }} · {{ t('admin.settings.instructions') }}</h2>
      <AdminLocalizedField v-model="info.dressCode" :label="t('admin.settings.dressCode')" />
      <AdminLocalizedField v-model="info.instructions" :label="t('admin.settings.instructions')" multiline />
      <div><button type="submit" class="btn btn-outline">{{ t('common.save') }}</button></div>
    </form>

    <AdminModal :open="!!editing" wide :title="editing?.id ? t('admin.events.editTitle') : t('admin.events.addTitle')" @close="editing = null">
      <form v-if="editing" id="event-form" class="form-grid" @submit.prevent="save">
        <AdminLocalizedField v-model="editing.data.title" :label="t('admin.events.titleField')" required />
        <div class="form-grid cols-2">
          <div class="field">
            <label for="e-start">{{ t('admin.events.start') }}</label>
            <input id="e-start" v-model="editing.data.start" type="datetime-local" required>
          </div>
          <div class="field" :class="{ invalid: endError }">
            <label for="e-end">{{ t('admin.events.end') }}</label>
            <input id="e-end" v-model="editing.data.end" type="datetime-local" required :min="editing.data.start" aria-describedby="e-end-error">
            <p v-if="endError" id="e-end-error" class="field-error">{{ t('admin.events.end') }} ≥ {{ t('admin.events.start') }}</p>
          </div>
        </div>
        <AdminLocalizedField v-model="editing.data.venue" :label="t('admin.events.venue')" />
        <AdminLocalizedField v-model="editing.data.address" :label="t('admin.events.address')" multiline />
        <AdminLocalizedField v-model="editing.data.description" :label="t('admin.events.description')" multiline />
        <div class="form-grid cols-2">
          <div class="field">
            <label for="e-map">{{ t('admin.events.mapUrl') }}</label>
            <input id="e-map" v-model="editing.data.mapUrl" type="url" placeholder="https://maps.google.com/…">
          </div>
          <div class="field">
            <label for="e-img">{{ t('admin.events.imageUrl') }}</label>
            <input id="e-img" v-model="editing.data.imageUrl" type="url">
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="editing = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="event-form" class="btn btn-primary" :disabled="saving || endError">{{ saving ? t('common.saving') : t('common.save') }}</button>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
.event-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.event { display: grid; grid-template-columns: auto 1fr; gap: var(--space-3); align-items: center; }
.event .row-actions { grid-column: 1 / -1; display: flex; gap: var(--space-1); justify-content: flex-end; }
@media (min-width: 720px) { .event { grid-template-columns: auto 1fr auto; } .event .row-actions { grid-column: auto; } }
.order { display: flex; flex-direction: column; }
.when { font-size: 0.85rem; color: var(--c-accent-ink); }
.body h2 { font-size: 1.25rem; }
</style>
