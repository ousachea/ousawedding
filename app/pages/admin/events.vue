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
// Saving a new wedding date (sidebar) moves every item
watch(() => wedding.value?.date, (d, old) => { if (old && d !== old) load() })

const blank = () => ({
  title: { km: '', en: '' }, description: { km: '', en: '' }, venue: { km: '', en: '' }, address: { km: '', en: '' },
  start: wedding.value?.date ?? '', end: wedding.value?.date ?? '', mapUrl: '', imageUrl: '', icon: 'calendar' as EventIcon,
})
type Draft = ReturnType<typeof blank>
const editing = ref<{ id: string | null, data: Draft } | null>(null)
const saving = ref(false)
const endError = computed(() => !!editing.value && editing.value.data.end < editing.value.data.start)

const openNew = () => (editing.value = { id: null, data: blank() })
const openEdit = (item: WeddingEvent) => {
  // structuredClone can't copy Vue's reactive proxies
  const e = toRaw(item)
  editing.value = { id: e.id, data: structuredClone({ title: e.title, description: e.description, venue: e.venue, address: e.address, start: e.start, end: e.end, mapUrl: e.mapUrl, imageUrl: e.imageUrl, icon: e.icon ?? 'calendar' }) }
}

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

// Arrows move an item one place; the order is saved once the taps stop, in one request
const moved = ref<string | null>(null)
const announce = ref('')
let saveTimer: ReturnType<typeof setTimeout> | undefined
let movedTimer: ReturnType<typeof setTimeout> | undefined
const saveOrder = () => api(`${base.value}/events/reorder`, { method: 'POST', body: { ids: events.value.map(e => e.id) } }).catch(load)
function queueSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveTimer = undefined; saveOrder() }, 500)
}
onBeforeUnmount(() => { if (saveTimer) { clearTimeout(saveTimer); saveOrder() } })

function move(index: number, step: number) {
  const to = index + step
  if (to < 0 || to >= events.value.length) return
  const list = [...events.value]
  const [item] = list.splice(index, 1)
  list.splice(to, 0, item!)
  events.value = list
  moved.value = item!.id
  clearTimeout(movedTimer)
  movedTimer = setTimeout(() => (moved.value = null), 1600)
  announce.value = t('admin.events.moved', { name: L(item!.title), n: to + 1 })
  queueSave()
}

// Guests see the items in this order, not by time, so offer to sort when the two differ
const chronological = computed(() => events.value.every((e, i, a) => !i || a[i - 1]!.start <= e.start))
function sortByTime() {
  events.value = [...events.value].sort((a, b) => a.start.localeCompare(b.start))
  queueSave()
  push(t('common.saved'))
}

const loc = computed(() => (locale.value === 'km' ? 'km-KH' : 'en-GB'))
const day = (iso: string) => iso.slice(0, 10)
const dayLabel = (iso: string) => new Date(`${day(iso)}T00:00:00Z`).toLocaleDateString(loc.value, { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const newDay = (i: number) => !i || day(events.value[i]!.start) !== day(events.value[i - 1]!.start)
const timeRange = (e: WeddingEvent) => {
  const end = day(e.end) === day(e.start) ? e.end.slice(11, 16) : `${new Date(`${day(e.end)}T00:00:00Z`).toLocaleDateString(loc.value, { timeZone: 'UTC', day: 'numeric', month: 'short' })} ${e.end.slice(11, 16)}`
  return `${e.start.slice(11, 16)} – ${end}`
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
    <div class="toolbar-row">
      <p v-if="wedding" class="muted small">{{ t('admin.events.timezone', { tz: wedding.timezone }) }}<template v-if="events.length > 1"> {{ t('admin.events.orderHint') }}</template></p>
      <div class="page-actions">
        <a v-if="wedding" :href="`${localePath(`/${wedding.slug}`)}#schedule`" target="wedding-invitation" class="btn btn-ghost btn-sm">{{ t('admin.invitations.preview') }} ↗</a>
        <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.events.add') }}</button>
      </div>
    </div>

    <div v-if="!chronological" class="notice" role="note">
      <p>{{ t('admin.events.outOfOrder') }}</p>
      <button type="button" class="btn btn-outline btn-sm" @click="sortByTime">{{ t('admin.events.sortByTime') }}</button>
    </div>

    <p v-if="loading && !events.length" class="muted">{{ t('common.loading') }}</p>
    <div v-else-if="!events.length" class="panel empty-state">
      <p>{{ t('admin.events.empty') }}</p>
      <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.events.add') }}</button>
    </div>
    <TransitionGroup v-else tag="ol" name="reorder" class="timeline">
      <li v-for="(e, i) in events" :key="e.id" class="slot">
        <h2 v-if="newDay(i)" class="day">{{ dayLabel(e.start) }}</h2>
        <article class="event" :class="{ moved: moved === e.id }">
          <AdminMoveButtons :index="i" :count="events.length" :name="L(e.title)" @move="move(i, $event)" />
          <span class="mark" aria-hidden="true"><WeddingIcon :name="e.icon ?? 'calendar'" /></span>
          <div class="body">
            <p class="when tabular">{{ timeRange(e) }}</p>
            <h3 class="title">{{ L(e.title) }}</h3>
            <p v-if="L(e.venue) || L(e.address)" class="muted small place">{{ L(e.venue) }}<template v-if="L(e.venue) && L(e.address)"> · </template>{{ L(e.address) }}</p>
          </div>
          <div class="row-actions">
            <button type="button" class="btn btn-outline btn-sm" @click="openEdit(e)">{{ t('common.edit') }}</button>
            <button type="button" class="btn btn-ghost btn-sm delete" @click="remove(e)">{{ t('common.delete') }}</button>
          </div>
        </article>
      </li>
    </TransitionGroup>
    <p class="visually-hidden" aria-live="polite">{{ announce }}</p>

    <form v-if="info" class="panel form-grid info" @submit.prevent="saveInfo">
      <h2>{{ t('admin.settings.dressCode') }} · {{ t('admin.settings.instructions') }}</h2>
      <AdminLocalizedField v-model="info.dressCode" :label="t('admin.settings.dressCode')" />
      <AdminLocalizedField v-model="info.instructions" :label="t('admin.settings.instructions')" multiline />
      <div><button type="submit" class="btn btn-outline">{{ t('common.save') }}</button></div>
    </form>

    <AdminModal :open="!!editing" wide :title="editing?.id ? t('admin.events.editTitle') : t('admin.events.addTitle')" @close="editing = null">
      <form v-if="editing" id="event-form" class="form-grid" @submit.prevent="save">
        <fieldset class="icons">
          <legend>{{ t('admin.events.icon') }}</legend>
          <label v-for="ic in EVENT_ICONS" :key="ic" class="icon-choice" :title="ic">
            <input v-model="editing.data.icon" type="radio" name="e-icon" :value="ic" class="visually-hidden" :aria-label="ic">
            <WeddingIcon :name="ic" />
          </label>
        </fieldset>
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
            <!-- Not type="url": gallery photos have site paths ("/uploads/…"), which the browser would reject -->
            <input id="e-img" v-model="editing.data.imageUrl">
          </div>
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="editing = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="event-form" class="btn btn-primary" :disabled="saving || endError">{{ saving ? t('common.saving') : t('common.save') }}</button>
      </template>
    </AdminModal>
    <AdminStepNav />
  </div>
</template>

<style scoped>
.toolbar-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-3); }
.toolbar-row > p { flex: 1 1 18rem; max-width: 40rem; }
.notice {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2) var(--space-4);
  padding: var(--space-3) var(--space-4); border-radius: var(--radius);
  background: color-mix(in srgb, var(--c-accent) 12%, var(--c-surface)); border: 1px solid color-mix(in srgb, var(--c-accent) 35%, transparent);
}
.notice p { flex: 1 1 16rem; }

.timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); max-width: 56rem; }
.day { margin: var(--space-3) 0 var(--space-1); font-size: 1rem; font-weight: 600; color: var(--c-secondary); }
.slot:first-child .day { margin-top: 0; }

.event {
  display: grid; grid-template-columns: auto auto minmax(0, 1fr); align-items: center; gap: var(--space-3) var(--space-4);
  padding: var(--space-3) var(--space-4) var(--space-3) var(--space-2);
  background: var(--c-surface); border: 1px solid var(--c-line-soft); border-radius: var(--radius);
  transition: box-shadow 0.3s, border-color 0.3s;
}
/* The item just moved keeps a ring for a moment, so the eye can follow it */
.event.moved { border-color: var(--c-secondary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-secondary) 18%, transparent); }

.mark {
  display: grid; place-items: center; width: 2.8rem; height: 2.8rem; border-radius: 50%;
  font-size: 1.3rem; color: var(--c-secondary); background: color-mix(in srgb, var(--c-accent) 16%, var(--c-surface));
}
.body { min-width: 0; }
.when { font-size: 0.9rem; font-weight: 600; color: var(--c-accent-ink); }
.title { font-size: 1.15rem; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
.place { overflow-wrap: anywhere; }
.row-actions { grid-column: 1 / -1; display: flex; gap: var(--space-2); justify-content: flex-end; }
.delete { color: var(--c-danger); }
@media (min-width: 720px) {
  .event { grid-template-columns: auto auto minmax(0, 1fr) auto; }
  .row-actions { grid-column: auto; }
}

@media (prefers-reduced-motion: no-preference) {
  .reorder-move { transition: transform 0.3s var(--ease-out); }
}

.info { max-width: 56rem; }
.icons { display: flex; flex-wrap: wrap; gap: var(--space-1); border: 0; padding: 0; margin: 0; }
.icons legend { font-size: 0.9rem; font-weight: 500; padding: 0; margin-bottom: var(--space-1); }
.icon-choice { display: grid; place-items: center; width: 3rem; height: 3rem; border: 1px solid var(--c-line); border-radius: var(--radius-sm); cursor: pointer; color: var(--c-accent-ink); font-size: 1.2rem; }
.icon-choice:has(input:checked) { border-color: var(--c-secondary); background: color-mix(in srgb, var(--c-secondary) 10%, transparent); color: var(--c-secondary); }
.icon-choice:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
</style>
