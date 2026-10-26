<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const localePath = useLocalePath()
const { base, id, wedding, loadWedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()

type Row = Guest & { invitation: { id: string, status: InvitationStatus, locale: Locale, viewedAt: string, url: string } | null }
const rows = ref<Row[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    rows.value = (await api<{ guests: Row[] }>(`${base.value}/guests`)).guests.filter(g => !g.archived).sort((a, b) => a.name.localeCompare(b.name))
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

// Publishing and deadline
const deadline = ref(wedding.value?.rsvp.deadline ?? '')
watch(wedding, w => (deadline.value = w?.rsvp.deadline ?? ''))
async function patchWedding(patch: Partial<Wedding>) {
  await api(base.value, { method: 'PATCH', body: patch })
  await loadWedding()
  push(t('common.saved'))
}
const togglePublish = () => patchWedding({ published: !wedding.value!.published })
const saveDeadline = () => patchWedding({ rsvp: { ...wedding.value!.rsvp, deadline: deadline.value } })

// Preview
const device = ref<'mobile' | 'desktop'>('mobile')
const previewUrl = computed(() => (wedding.value ? localePath(`/${wedding.value.slug}`) : ''))

// Links
async function generate(guestIds: string[], regenerate = false) {
  const { created } = await api<{ created: unknown[] }>(`${base.value}/invitations`, { method: 'POST', body: { guestIds, regenerate } })
  push(`${t('admin.guests.createLinks')}: ${created.length}`)
  await load()
}
const missing = computed(() => rows.value.filter(r => !r.invitation).map(r => r.id))
async function regenerate(r: Row) {
  if (await confirm(t('admin.invitations.regenerateConfirm', { name: r.name }), { action: t('admin.invitations.regenerate') })) await generate([r.id], true)
}
async function patchInvitation(r: Row, body: { status?: string, locale?: Locale }) {
  await api(`${base.value}/invitations/${r.invitation!.id}`, { method: 'PATCH', body })
  push(t('common.saved'))
  await load()
}
async function revoke(r: Row) {
  if (await confirm(t('admin.invitations.revokeConfirm', { name: r.name }), { action: t('admin.invitations.revoke') })) await patchInvitation(r, { status: 'revoked' })
}
async function copy(r: Row) {
  try {
    await navigator.clipboard.writeText(r.invitation!.url)
    push(t('common.copied'))
  } catch {
    window.prompt(t('common.copy'), r.invitation!.url)
  }
}
const canShare = ref(false)
onMounted(() => (canShare.value = typeof navigator.share === 'function'))
async function share(r: Row) {
  try {
    await navigator.share({ title: wedding.value!.share[r.invitation!.locale].title, url: r.invitation!.url })
    if (r.invitation!.status === 'draft') await patchInvitation(r, { status: 'sent' })
  } catch {}
}
const qrFor = ref<Row | null>(null)
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.invitations') }}</h1>
      <NuxtLink :to="localePath('/admin/invitations/print')" class="btn btn-ghost btn-sm">{{ t('admin.invitations.print') }}</NuxtLink>
    </div>

    <section v-if="wedding" class="panel publish">
      <div>
        <p><span class="badge" :class="wedding.published ? 'responded' : 'none'">{{ wedding.published ? t('admin.invitations.published') : t('admin.invitations.unpublished') }}</span></p>
      </div>
      <button type="button" class="btn" :class="wedding.published ? 'btn-outline' : 'btn-primary'" @click="togglePublish">
        {{ wedding.published ? t('admin.invitations.unpublish') : t('admin.invitations.publish') }}
      </button>
      <form class="deadline" @submit.prevent="saveDeadline">
        <div class="field">
          <label for="deadline">{{ t('admin.invitations.deadline') }} ({{ wedding.timezone }})</label>
          <input id="deadline" v-model="deadline" type="datetime-local" required>
        </div>
        <button type="submit" class="btn btn-outline btn-sm">{{ t('common.save') }}</button>
      </form>
    </section>

    <section class="panel">
      <div class="preview-head">
        <h2>{{ t('admin.invitations.preview') }}</h2>
        <div class="toolbar">
          <button type="button" class="btn btn-sm" :class="device === 'mobile' ? 'btn-primary' : 'btn-ghost'" :aria-pressed="device === 'mobile'" @click="device = 'mobile'">{{ t('admin.invitations.mobile') }}</button>
          <button type="button" class="btn btn-sm" :class="device === 'desktop' ? 'btn-primary' : 'btn-ghost'" :aria-pressed="device === 'desktop'" @click="device = 'desktop'">{{ t('admin.invitations.desktop') }}</button>
          <a :href="previewUrl" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">{{ t('admin.invitations.openPreview') }} ↗</a>
        </div>
      </div>
      <div class="frame-wrap" :class="device">
        <iframe :src="previewUrl" :title="t('admin.invitations.preview')" loading="lazy" />
      </div>
    </section>

    <section class="panel">
      <div class="preview-head">
        <h2>{{ t('admin.invitations.links') }}</h2>
        <button v-if="missing.length" type="button" class="btn btn-primary btn-sm" @click="generate(missing)">{{ t('admin.invitations.generateMissing') }} ({{ missing.length }})</button>
      </div>
      <p class="muted small hint">{{ t('admin.invitations.linksHint') }}</p>

      <p v-if="loading && !rows.length" class="muted">{{ t('common.loading') }}</p>
      <div v-else-if="!rows.length" class="empty-state">
        <p>{{ t('admin.invitations.noGuests') }}</p>
        <NuxtLink :to="localePath('/admin/guests')" class="btn btn-outline">{{ t('admin.guests.add') }}</NuxtLink>
      </div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t('admin.guests.name') }}</th>
              <th>{{ t('admin.guests.invitation') }}</th>
              <th>{{ t('common.language') }}</th>
              <th><span class="visually-hidden">{{ t('common.edit') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="grow"><strong>{{ r.name }}</strong><p class="muted small">{{ r.group }}</p></td>
              <td><span class="badge" :class="r.invitation?.status ?? 'none'">{{ t(`admin.invitations.statuses.${r.invitation?.status ?? 'none'}`) }}</span></td>
              <td>
                <select v-if="r.invitation" :value="r.invitation.locale" class="input lang-select" :aria-label="t('common.language')" @change="patchInvitation(r, { locale: ($event.target as HTMLSelectElement).value as Locale })">
                  <option value="km">{{ t('common.khmer') }}</option>
                  <option value="en">{{ t('common.english') }}</option>
                </select>
              </td>
              <td>
                <div class="row-actions">
                  <button v-if="!r.invitation" type="button" class="btn btn-outline btn-sm" @click="generate([r.id])">{{ t('admin.invitations.generate') }}</button>
                  <template v-else>
                    <button type="button" class="btn btn-ghost btn-sm" @click="copy(r)">{{ t('common.copy') }}</button>
                    <button v-if="canShare" type="button" class="btn btn-ghost btn-sm" @click="share(r)">{{ t('admin.invitations.share') }}</button>
                    <button type="button" class="btn btn-ghost btn-sm" @click="qrFor = r">{{ t('admin.invitations.qr') }}</button>
                    <button v-if="r.invitation.status === 'draft'" type="button" class="btn btn-ghost btn-sm" @click="patchInvitation(r, { status: 'sent' })">{{ t('admin.invitations.markSent') }}</button>
                    <button type="button" class="btn btn-ghost btn-sm" @click="regenerate(r)">{{ t('admin.invitations.regenerate') }}</button>
                    <button type="button" class="btn btn-danger btn-sm" @click="revoke(r)">{{ t('admin.invitations.revoke') }}</button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminModal :open="!!qrFor" :title="`${t('admin.invitations.qr')}: ${qrFor?.name ?? ''}`" @close="qrFor = null">
      <div v-if="qrFor?.invitation" class="qr-box">
        <AdminQrCode :value="qrFor.invitation.url" :size="240" />
        <p class="muted small url">{{ qrFor.invitation.url }}</p>
      </div>
    </AdminModal>
  </div>
</template>

<style scoped>
.publish { display: flex; flex-wrap: wrap; align-items: flex-end; gap: var(--space-4); justify-content: space-between; }
.deadline { display: flex; gap: var(--space-2); align-items: flex-end; flex-wrap: wrap; }
.preview-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
.preview-head h2 { font-size: 1.3rem; }
.hint { margin-bottom: var(--space-4); }
.frame-wrap { margin-inline: auto; border: 1px solid var(--c-line); border-radius: var(--radius); overflow: hidden; background: #fff; transition: width 0.3s var(--ease-out); }
.frame-wrap.mobile { width: min(100%, 390px); height: 720px; }
.frame-wrap.desktop { width: 100%; height: 720px; }
.frame-wrap iframe { width: 100%; height: 100%; border: 0; }
.lang-select { min-height: 36px; padding: 0.2rem 0.5rem; width: auto; }
.qr-box { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
.url { word-break: break-all; text-align: center; }
</style>
