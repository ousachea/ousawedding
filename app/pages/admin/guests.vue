<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, id } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

type Row = Guest & {
  invitation: { id: string, status: InvitationStatus, locale: Locale, viewedAt: string, url: string } | null
  rsvp: { attending: boolean, count: number, attendeeNames: string[], dietary: string, message: string, source: string, updatedAt: string } | null
}
const rows = ref<Row[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    rows.value = (await api<{ guests: Row[] }>(`${base.value}/guests`)).guests
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

// Filters, search and sort run in the browser; a wedding guest list fits comfortably in memory
const q = ref('')
const status = ref<'' | 'attending' | 'declined' | 'pending'>('')
const group = ref('')
const side = ref<'' | GuestSide>('')
const showArchived = ref(false)
const sort = ref<'name' | 'status' | 'group' | 'updated'>('name')
const statusOf = (r: Row) => (r.rsvp ? (r.rsvp.attending ? 'attending' : 'declined') : 'pending')
const groups = computed(() => [...new Set(rows.value.map(r => r.group).filter(Boolean))].sort())

const visible = computed(() => {
  const needle = q.value.trim().toLowerCase()
  const list = rows.value.filter(r =>
    r.archived === showArchived.value
    && (!needle || r.name.toLowerCase().includes(needle) || r.phone.includes(needle) || r.email.toLowerCase().includes(needle))
    && (!status.value || statusOf(r) === status.value)
    && (!group.value || r.group === group.value)
    && (!side.value || r.side === side.value))
  const order = { attending: 0, pending: 1, declined: 2 }
  const cmp: Record<typeof sort.value, (a: Row, b: Row) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    status: (a, b) => order[statusOf(a)] - order[statusOf(b)] || a.name.localeCompare(b.name),
    group: (a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name),
    updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  }
  return list.sort(cmp[sort.value])
})

// Selection
const selected = ref(new Set<string>())
watch([visible, showArchived], () => {
  const ids = new Set(visible.value.map(r => r.id))
  selected.value = new Set([...selected.value].filter(x => ids.has(x)))
})
const allSelected = computed(() => visible.value.length > 0 && visible.value.every(r => selected.value.has(r.id)))
function toggleAll() {
  selected.value = allSelected.value ? new Set() : new Set(visible.value.map(r => r.id))
}
function toggle(rowId: string) {
  const next = new Set(selected.value)
  next.has(rowId) ? next.delete(rowId) : next.add(rowId)
  selected.value = next
}

// Add / edit
const emptyGuest = () => ({ name: '', side: 'both' as GuestSide, group: '', householdId: '', maxAttendees: 2, phone: '', email: '', notes: '' })
const editing = ref<{ id: string | null, data: ReturnType<typeof emptyGuest> } | null>(null)
const saving = ref(false)
const openNew = () => (editing.value = { id: null, data: emptyGuest() })
const openEdit = (r: Row) => (editing.value = {
  id: r.id,
  data: { name: r.name, side: r.side, group: r.group, householdId: r.householdId, maxAttendees: r.maxAttendees, phone: r.phone, email: r.email, notes: r.notes },
})
async function saveGuest() {
  if (!editing.value || saving.value) return
  saving.value = true
  try {
    const { id: guestId, data } = editing.value
    await api(guestId ? `${base.value}/guests/${guestId}` : `${base.value}/guests`, { method: guestId ? 'PATCH' : 'POST', body: data })
    editing.value = null
    push(t('common.saved'))
    await load()
  } finally {
    saving.value = false
  }
}

// RSVP recorded by the admin
const recording = ref<{ row: Row, attending: boolean, count: number, dietary: string, message: string } | null>(null)
const openRecord = (r: Row) => (recording.value = { row: r, attending: r.rsvp?.attending ?? true, count: r.rsvp?.count || 1, dietary: r.rsvp?.dietary ?? '', message: r.rsvp?.message ?? '' })
async function saveRecord() {
  if (!recording.value || saving.value) return
  saving.value = true
  try {
    const { row, ...body } = recording.value
    await api(`${base.value}/rsvps/${row.id}`, { method: 'PUT', body: { ...body, count: body.attending ? body.count : 0 } })
    recording.value = null
    push(t('common.saved'))
    await load()
  } finally {
    saving.value = false
  }
}
async function clearRsvp(r: Row) {
  if (!await confirm(t('admin.guests.clearConfirm', { name: r.name }), { action: t('admin.guests.clearRsvp') })) return
  await api(`${base.value}/rsvps/${r.id}`, { method: 'DELETE' })
  push(t('common.saved'))
  await load()
}

// Archive / delete
async function bulk(action: 'archive' | 'restore' | 'setGroup', ids = [...selected.value]) {
  if (!ids.length) return
  let groupName: string | undefined
  if (action === 'archive' && !await confirm(t('admin.guests.archiveConfirm', { n: ids.length }), { action: t('admin.guests.archive') })) return
  if (action === 'setGroup') {
    groupName = window.prompt(t('admin.guests.groupPrompt'))?.trim()
    if (groupName === undefined) return
  }
  await api(`${base.value}/guests/bulk`, { method: 'POST', body: { ids, action, group: groupName } })
  push(t('common.saved'))
  selected.value = new Set()
  await load()
}
async function remove(r: Row) {
  if (!await confirm(t('admin.guests.deleteConfirm', { name: r.name }), { action: t('admin.guests.deleteForever') })) return
  await api(`${base.value}/guests/${r.id}`, { method: 'DELETE' })
  push(t('common.saved'))
  await load()
}

// Links
async function createLinks(ids = [...selected.value]) {
  if (!ids.length) return
  const { created } = await api<{ created: unknown[] }>(`${base.value}/invitations`, { method: 'POST', body: { guestIds: ids } })
  push(`${t('admin.guests.createLinks')}: ${created.length}`)
  selected.value = new Set()
  await load()
}
async function copy(url: string) {
  try {
    await navigator.clipboard.writeText(url)
    push(t('common.copied'))
  } catch {
    window.prompt(t('common.copy'), url)
  }
}
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.guests') }}</h1>
      <div class="page-actions">
        <a :href="`${base}/guests/export.csv`" class="btn btn-ghost btn-sm" download>{{ t('admin.guests.exportGuests') }}</a>
        <a :href="`${base}/rsvps/export.csv`" class="btn btn-ghost btn-sm" download>{{ t('admin.guests.exportRsvps') }}</a>
        <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.guests.add') }}</button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="q" type="search" class="input search" :placeholder="t('common.search')" :aria-label="t('common.search')">
      <select v-model="status" class="input" :aria-label="t('admin.guests.status')">
        <option value="">{{ t('admin.guests.status') }}: {{ t('common.all') }}</option>
        <option v-for="s in (['attending', 'pending', 'declined'] as const)" :key="s" :value="s">{{ t(`admin.guests.statuses.${s}`) }}</option>
      </select>
      <select v-model="group" class="input" :aria-label="t('admin.guests.group')">
        <option value="">{{ t('admin.guests.group') }}: {{ t('common.all') }}</option>
        <option v-for="g in groups" :key="g" :value="g">{{ g }}</option>
      </select>
      <select v-model="side" class="input" :aria-label="t('admin.guests.side')">
        <option value="">{{ t('admin.guests.side') }}: {{ t('common.all') }}</option>
        <option v-for="s in (['bride', 'groom', 'both'] as const)" :key="s" :value="s">{{ t(`admin.guests.sides.${s}`) }}</option>
      </select>
      <select v-model="sort" class="input" :aria-label="t('admin.guests.sort')">
        <option value="name">{{ t('admin.guests.sort') }}: {{ t('admin.guests.sortName') }}</option>
        <option value="status">{{ t('admin.guests.sort') }}: {{ t('admin.guests.sortStatus') }}</option>
        <option value="group">{{ t('admin.guests.sort') }}: {{ t('admin.guests.sortGroup') }}</option>
        <option value="updated">{{ t('admin.guests.sort') }}: {{ t('admin.guests.sortUpdated') }}</option>
      </select>
      <label class="check"><input v-model="showArchived" type="checkbox"> {{ t('admin.guests.showArchived') }}</label>
    </div>

    <div v-if="selected.size" class="bulk panel" role="region" :aria-label="t('admin.guests.selected', { n: selected.size })">
      <strong>{{ t('admin.guests.selected', { n: selected.size }) }}</strong>
      <template v-if="!showArchived">
        <button type="button" class="btn btn-outline btn-sm" @click="createLinks()">{{ t('admin.guests.createLinks') }}</button>
        <button type="button" class="btn btn-ghost btn-sm" @click="bulk('setGroup')">{{ t('admin.guests.setGroup') }}</button>
        <button type="button" class="btn btn-danger btn-sm" @click="bulk('archive')">{{ t('admin.guests.archive') }}</button>
      </template>
      <button v-else type="button" class="btn btn-outline btn-sm" @click="bulk('restore')">{{ t('admin.guests.restore') }}</button>
    </div>

    <p v-if="loading && !rows.length" class="muted">{{ t('common.loading') }}</p>
    <div v-else-if="!rows.length" class="panel empty-state">
      <p>{{ t('admin.guests.empty') }}</p>
      <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.guests.add') }}</button>
    </div>
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th><input type="checkbox" :checked="allSelected" :aria-label="t('common.all')" @change="toggleAll"></th>
            <th>{{ t('admin.guests.name') }}</th>
            <th>{{ t('admin.guests.group') }}</th>
            <th class="num">{{ t('admin.guests.maxAttendees') }}</th>
            <th>{{ t('admin.guests.status') }}</th>
            <th>{{ t('admin.guests.invitation') }}</th>
            <th><span class="visually-hidden">{{ t('common.edit') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!visible.length"><td colspan="7" class="muted">{{ t('admin.guests.noMatch') }}</td></tr>
          <tr v-for="r in visible" :key="r.id" :class="{ archived: r.archived }">
            <td><input type="checkbox" :checked="selected.has(r.id)" :aria-label="r.name" @change="toggle(r.id)"></td>
            <td class="grow">
              <strong>{{ r.name }}</strong>
              <p class="muted small">{{ t(`admin.guests.sides.${r.side}`) }}<template v-if="r.phone"> · {{ r.phone }}</template></p>
            </td>
            <td :data-label="r.group ? t('admin.guests.group') : undefined">{{ r.group }}</td>
            <td class="num" :data-label="t('admin.guests.maxAttendees')">{{ r.rsvp?.attending ? `${r.rsvp.count} / ` : '' }}{{ r.maxAttendees }}</td>
            <td>
              <span class="badge" :class="statusOf(r)">{{ t(`admin.guests.statuses.${statusOf(r)}`) }}</span>
              <p v-if="r.rsvp?.dietary" class="muted small">{{ r.rsvp.dietary }}</p>
            </td>
            <td>
              <span class="badge" :class="r.invitation?.status ?? 'none'">{{ t(`admin.invitations.statuses.${r.invitation?.status ?? 'none'}`) }}</span>
            </td>
            <td>
              <div class="row-actions">
                <template v-if="!r.archived">
                  <button v-if="r.invitation?.url" type="button" class="btn btn-ghost btn-sm" @click="copy(r.invitation.url)">{{ t('common.copy') }}</button>
                  <button v-else type="button" class="btn btn-ghost btn-sm" @click="createLinks([r.id])">{{ t('admin.invitations.generate') }}</button>
                  <button type="button" class="btn btn-ghost btn-sm" @click="openRecord(r)">{{ t('admin.guests.recordRsvp') }}</button>
                  <button v-if="r.rsvp" type="button" class="btn btn-ghost btn-sm" @click="clearRsvp(r)">{{ t('admin.guests.clearRsvp') }}</button>
                  <button type="button" class="btn btn-ghost btn-sm" @click="openEdit(r)">{{ t('common.edit') }}</button>
                  <button type="button" class="btn btn-danger btn-sm" @click="bulk('archive', [r.id])">{{ t('admin.guests.archive') }}</button>
                </template>
                <template v-else>
                  <button type="button" class="btn btn-outline btn-sm" @click="bulk('restore', [r.id])">{{ t('admin.guests.restore') }}</button>
                  <button type="button" class="btn btn-danger btn-sm" @click="remove(r)">{{ t('admin.guests.deleteForever') }}</button>
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminModal :open="!!editing" :title="editing?.id ? t('admin.guests.editTitle') : t('admin.guests.addTitle')" @close="editing = null">
      <form v-if="editing" id="guest-form" class="form-grid" @submit.prevent="saveGuest">
        <div class="field">
          <label for="g-name">{{ t('admin.guests.name') }} *</label>
          <input id="g-name" v-model="editing.data.name" required maxlength="120">
        </div>
        <div class="form-grid cols-2">
          <div class="field">
            <label for="g-side">{{ t('admin.guests.side') }}</label>
            <select id="g-side" v-model="editing.data.side">
              <option v-for="s in (['bride', 'groom', 'both'] as const)" :key="s" :value="s">{{ t(`admin.guests.sides.${s}`) }}</option>
            </select>
          </div>
          <div class="field">
            <label for="g-group">{{ t('admin.guests.group') }}</label>
            <input id="g-group" v-model="editing.data.group" list="group-options" maxlength="60" :placeholder="t('admin.guests.groupHint')">
            <datalist id="group-options"><option v-for="g in groups" :key="g" :value="g" /></datalist>
          </div>
          <div class="field">
            <label for="g-max">{{ t('admin.guests.maxAttendees') }}</label>
            <input id="g-max" v-model.number="editing.data.maxAttendees" type="number" min="1" max="20" required>
          </div>
          <div class="field">
            <label for="g-house">{{ t('admin.guests.household') }}</label>
            <input id="g-house" v-model="editing.data.householdId" maxlength="60">
          </div>
          <div class="field">
            <label for="g-phone">{{ t('admin.guests.phone') }}</label>
            <input id="g-phone" v-model="editing.data.phone" type="tel" maxlength="40">
          </div>
          <div class="field">
            <label for="g-email">{{ t('admin.guests.email') }}</label>
            <input id="g-email" v-model="editing.data.email" type="email">
          </div>
        </div>
        <div class="field">
          <label for="g-notes">{{ t('admin.guests.notes') }}</label>
          <textarea id="g-notes" v-autosize rows="1" v-model="editing.data.notes" maxlength="1000" />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="editing = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="guest-form" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
      </template>
    </AdminModal>

    <AdminModal :open="!!recording" :title="`${t('admin.guests.recordRsvp')}: ${recording?.row.name ?? ''}`" @close="recording = null">
      <form v-if="recording" id="record-form" class="form-grid" @submit.prevent="saveRecord">
        <label class="check"><input v-model="recording.attending" type="radio" :value="true"> {{ t('rsvp.accept') }}</label>
        <label class="check"><input v-model="recording.attending" type="radio" :value="false"> {{ t('rsvp.decline') }}</label>
        <div v-if="recording.attending" class="field">
          <label for="r-count">{{ t('rsvp.count') }} (≤ {{ recording.row.maxAttendees }})</label>
          <input id="r-count" v-model.number="recording.count" type="number" min="1" :max="recording.row.maxAttendees" required>
        </div>
        <div class="field">
          <label for="r-diet">{{ t('rsvp.dietary') }}</label>
          <input id="r-diet" v-model="recording.dietary" maxlength="500">
        </div>
        <div class="field">
          <label for="r-msg">{{ t('rsvp.message') }}</label>
          <textarea id="r-msg" v-autosize rows="1" v-model="recording.message" maxlength="1000" />
        </div>
      </form>
      <template #footer>
        <button type="button" class="btn btn-ghost" @click="recording = null">{{ t('common.cancel') }}</button>
        <button type="submit" form="record-form" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
      </template>
    </AdminModal>
  </div>
</template>

<style scoped>
.bulk { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); }
</style>
