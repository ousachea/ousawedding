<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const localePath = useLocalePath()
const { base, id, wedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()

const rows = ref<Guest[]>([])
const loading = ref(true)
async function load() {
  loading.value = true
  try {
    rows.value = (await api<{ guests: Guest[] }>(`${base.value}/guests`)).guests.filter(g => !g.archived).sort((a, b) => a.name.localeCompare(b.name))
  } finally {
    loading.value = false
  }
}
watch(id, load, { immediate: true })

// Personal links: the live site address plus each guest's name (shown on the envelope). Nothing is stored
// or tracked; anyone with a link can see the name in it. Without NUXT_PUBLIC_SITE_URL the links would point
// at this computer, so the page warns instead.
const siteUrl = useRuntimeConfig().public.siteUrl
const locale = ref<Locale>('en')
const linkFor = (name: string) => (wedding.value ? inviteLink(wedding.value, name, siteUrl || location.origin, locale.value) : '')
// A link for any name typed in, without adding them to the guest list
const customName = ref('')

const device = ref<'mobile' | 'desktop'>('mobile')
const previewUrl = computed(() => (wedding.value ? localePath(`/${wedding.value.slug}`) : ''))

async function copy(name: string) {
  try {
    await navigator.clipboard.writeText(linkFor(name))
    push(t('common.copied'))
  } catch {
    window.prompt(t('common.copy'), linkFor(name))
  }
}
const canShare = ref(false)
onMounted(() => (canShare.value = typeof navigator.share === 'function'))
async function share(name: string) {
  try {
    await navigator.share({ title: wedding.value!.share[locale.value].title, url: linkFor(name) })
  } catch {}
}
const qrFor = ref<string | null>(null)
</script>

<template>
  <div class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.invitations') }}</h1>
      <NuxtLink :to="localePath(`/admin/invitations/print?lang=${locale}`)" class="btn btn-ghost btn-sm">{{ t('admin.invitations.print') }}</NuxtLink>
    </div>

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
        <select v-model="locale" class="input lang-select" :aria-label="t('common.language')">
          <option value="km">{{ t('common.khmer') }}</option>
          <option value="en">{{ t('common.english') }}</option>
        </select>
      </div>
      <p class="muted small hint">{{ t('admin.invitations.linksHint') }}</p>
      <p v-if="!siteUrl" class="notice small" role="alert">{{ t('admin.invitations.noSiteUrl') }}</p>

      <div class="custom">
        <label for="custom-name">{{ t('admin.invitations.customName') }}</label>
        <div class="custom-row">
          <input id="custom-name" v-model.trim="customName" class="input" maxlength="120" :placeholder="t('admin.invitations.customPlaceholder')">
          <template v-if="customName">
            <button type="button" class="btn btn-primary btn-sm" @click="copy(customName)">{{ t('common.copy') }}</button>
            <button v-if="canShare" type="button" class="btn btn-ghost btn-sm" @click="share(customName)">{{ t('admin.invitations.share') }}</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="qrFor = customName">{{ t('admin.invitations.qr') }}</button>
          </template>
        </div>
        <p v-if="customName" class="muted small link">{{ linkFor(customName) }}</p>
      </div>

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
              <th><span class="visually-hidden">{{ t('common.edit') }}</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="g in rows" :key="g.id">
              <td class="grow"><strong>{{ g.name }}</strong><p class="muted small link">{{ linkFor(g.name) }}</p></td>
              <td>
                <div class="row-actions">
                  <button type="button" class="btn btn-ghost btn-sm" @click="copy(g.name)">{{ t('common.copy') }}</button>
                  <button v-if="canShare" type="button" class="btn btn-ghost btn-sm" @click="share(g.name)">{{ t('admin.invitations.share') }}</button>
                  <button type="button" class="btn btn-ghost btn-sm" @click="qrFor = g.name">{{ t('admin.invitations.qr') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminModal :open="!!qrFor" :title="`${t('admin.invitations.qr')}: ${qrFor ?? ''}`" @close="qrFor = null">
      <div v-if="qrFor" class="qr-box">
        <AdminQrCode :value="linkFor(qrFor)" :size="240" />
        <p class="muted small url">{{ linkFor(qrFor) }}</p>
      </div>
    </AdminModal>
  </div>
</template>

<style scoped>
.preview-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-3); }
.preview-head h2 { font-size: 1.3rem; }
.hint { margin-bottom: var(--space-4); }
.notice { margin-bottom: var(--space-4); padding: var(--space-2) var(--space-3); border-radius: var(--radius-sm); background: color-mix(in srgb, var(--c-danger) 10%, transparent); color: var(--c-danger); }
.frame-wrap { margin-inline: auto; border: 1px solid var(--c-line); border-radius: var(--radius); overflow: hidden; background: #fff; transition: width 0.3s var(--ease-out); }
.frame-wrap.mobile { width: min(100%, 390px); height: 720px; }
.frame-wrap.desktop { width: 100%; height: 720px; }
.frame-wrap iframe { width: 100%; height: 100%; border: 0; }
.lang-select { min-height: 36px; padding: 0.2rem 0.5rem; width: auto; }
.link { word-break: break-all; }
.custom { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-5); padding-bottom: var(--space-5); border-bottom: 1px solid var(--c-line-soft); }
.custom label { font-weight: 500; }
.custom-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); }
.custom-row .input { flex: 1 1 14rem; }
.qr-box { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
.url { word-break: break-all; text-align: center; }
</style>
