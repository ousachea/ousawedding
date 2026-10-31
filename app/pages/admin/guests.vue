<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, id, wedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

type Row = Guest
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
const group = ref('')
const side = ref<'' | GuestSide>('')
const showArchived = ref(false)
const sort = ref<'name' | 'group' | 'updated'>('name')
const groups = computed(() => [...new Set(rows.value.map(r => r.group).filter(Boolean))].sort())

const visible = computed(() => {
  const needle = q.value.trim().toLowerCase()
  const list = rows.value.filter(r =>
    r.archived === showArchived.value
    && (!needle || r.name.toLowerCase().includes(needle) || r.phone.includes(needle) || r.email.toLowerCase().includes(needle))
    && (!group.value || r.group === group.value)
    && (!side.value || r.side === side.value))
  const cmp: Record<typeof sort.value, (a: Row, b: Row) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
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
const emptyGuest = () => ({ name: '', side: 'both' as GuestSide, group: '', householdId: '', maxAttendees: 2, spouse: '' as Spouse, phone: '', email: '', notes: '' })
const editing = ref<{ id: string | null, data: ReturnType<typeof emptyGuest> } | null>(null)
const saving = ref(false)
const openNew = () => (editing.value = { id: null, data: emptyGuest() })
const openEdit = (r: Row) => (editing.value = {
  id: r.id,
  data: { name: r.name, side: r.side, group: r.group, householdId: r.householdId, maxAttendees: r.maxAttendees, spouse: r.spouse ?? '', phone: r.phone, email: r.email, notes: r.notes },
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

// Personal links: the live site address plus the guest's name (and spouse)
const siteUrl = useRuntimeConfig().public.siteUrl
const linkFor = (r: Row) => (wedding.value ? inviteLink(wedding.value, r.name, siteUrl || location.origin, 'en', r.spouse) : '')
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
        <button type="button" class="btn btn-primary" @click="openNew">+ {{ t('admin.guests.add') }}</button>
      </div>
    </div>

    <div class="toolbar">
      <input v-model="q" type="search" class="input search" :placeholder="t('common.search')" :aria-label="t('common.search')">
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
        <option value="group">{{ t('admin.guests.sort') }}: {{ t('admin.guests.sortGroup') }}</option>
        <option value="updated">{{ t('admin.guests.sort') }}: {{ t('admin.guests.sortUpdated') }}</option>
      </select>
      <label class="check"><input v-model="showArchived" type="checkbox"> {{ t('admin.guests.showArchived') }}</label>
    </div>

    <div v-if="selected.size" class="bulk panel" role="region" :aria-label="t('admin.guests.selected', { n: selected.size })">
      <strong>{{ t('admin.guests.selected', { n: selected.size }) }}</strong>
      <template v-if="!showArchived">
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
            <th><span class="visually-hidden">{{ t('common.edit') }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!visible.length"><td colspan="5" class="muted">{{ t('admin.guests.noMatch') }}</td></tr>
          <tr v-for="r in visible" :key="r.id" :class="{ archived: r.archived }">
            <td><input type="checkbox" :checked="selected.has(r.id)" :aria-label="r.name" @change="toggle(r.id)"></td>
            <td class="grow">
              <strong>{{ withSpouse(r.name, r.spouse, 'en') }}</strong>
              <p class="muted small">{{ t(`admin.guests.sides.${r.side}`) }}<template v-if="r.phone"> · {{ r.phone }}</template></p>
              <a v-if="!r.archived" :href="linkFor(r)" target="_blank" rel="noopener" class="small guest-link">{{ linkFor(r) }}</a>
            </td>
            <td :data-label="r.group ? t('admin.guests.group') : undefined">{{ r.group }}</td>
            <td class="num" :data-label="t('admin.guests.maxAttendees')">{{ r.maxAttendees }}</td>
            <td>
              <div class="row-actions">
                <template v-if="!r.archived">
                  <button type="button" class="btn btn-ghost btn-sm" @click="copy(linkFor(r))">{{ t('admin.guests.copyLink') }}</button>
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
        <!-- Invited with their wife or husband: the envelope then reads "… and wife" / "… and husband" -->
        <div class="field">
          <label class="check">
            <input type="checkbox" :checked="!!editing.data.spouse" @change="editing.data.spouse = ($event.target as HTMLInputElement).checked ? 'wife' : ''">
            {{ t('admin.guests.withSpouse') }}
          </label>
          <div v-if="editing.data.spouse" class="spouse" role="radiogroup" :aria-label="t('admin.guests.withSpouse')">
            <label class="check"><input v-model="editing.data.spouse" type="radio" value="wife"> {{ t('admin.guests.wife') }}</label>
            <label class="check"><input v-model="editing.data.spouse" type="radio" value="husband"> {{ t('admin.guests.husband') }}</label>
          </div>
          <p v-if="editing.data.spouse" class="muted small">{{ t('admin.guests.spouseShown', { name: withSpouse(editing.data.name || t('admin.guests.name'), editing.data.spouse, 'en') }) }}</p>
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

  </div>
</template>

<style scoped>
.guest-link { display: block; word-break: break-all; color: var(--c-muted); }
.guest-link:hover { color: var(--c-secondary); }
.spouse { display: flex; gap: var(--space-4); padding-left: 1.6rem; }
.bulk { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); }
</style>
