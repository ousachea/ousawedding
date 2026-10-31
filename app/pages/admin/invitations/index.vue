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

// Personal links: the live site address plus each guest's name and spouse (shown on the envelope). Nothing is stored
// or tracked; anyone with a link can see the name in it. Without NUXT_PUBLIC_SITE_URL the links would point
// at this computer, so the page warns instead.
const siteUrl = useRuntimeConfig().public.siteUrl
const locale = ref<Locale>('en')
type Who = { name: string, spouse?: Spouse }
const linkFor = (who: Who) => (wedding.value ? inviteLink(wedding.value, who.name, siteUrl || location.origin, locale.value, who.spouse) : '')
// A link for any name typed in (with their spouse, if ticked), without adding them to the guest list
const customName = ref('')
const customSpouse = ref<Spouse>('')
const custom = computed<Who>(() => ({ name: customName.value, spouse: customSpouse.value }))

const device = ref<'mobile' | 'desktop'>('mobile')
const previewUrl = computed(() => (wedding.value ? localePath(`/${wedding.value.slug}`) : ''))

async function copy(who: Who) {
  try {
    await navigator.clipboard.writeText(linkFor(who))
    push(t('common.copied'))
  } catch {
    window.prompt(t('common.copy'), linkFor(who))
  }
}
const canShare = ref(false)
onMounted(() => (canShare.value = typeof navigator.share === 'function'))
async function share(who: Who) {
  try {
    await navigator.share({ title: wedding.value!.share[locale.value].title, url: linkFor(who) })
  } catch {}
}
const qrFor = ref<Who | null>(null)
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
            <button type="button" class="btn btn-primary btn-sm" @click="copy(custom)">{{ t('common.copy') }}</button>
            <button v-if="canShare" type="button" class="btn btn-ghost btn-sm" @click="share(custom)">{{ t('admin.invitations.share') }}</button>
            <button type="button" class="btn btn-ghost btn-sm" @click="qrFor = custom">{{ t('admin.invitations.qr') }}</button>
          </template>
        </div>
        <div class="spouse">
          <label class="check">
            <input type="checkbox" :checked="!!customSpouse" @change="customSpouse = ($event.target as HTMLInputElement).checked ? 'wife' : ''">
            {{ t('admin.guests.withSpouse') }}
          </label>
          <template v-if="customSpouse">
            <label class="check"><input v-model="customSpouse" type="radio" value="wife"> {{ t('admin.guests.wife') }}</label>
            <label class="check"><input v-model="customSpouse" type="radio" value="husband"> {{ t('admin.guests.husband') }}</label>
          </template>
        </div>
        <p v-if="customName && customSpouse" class="muted small">{{ t('admin.guests.spouseShown', { name: withSpouse(customName, customSpouse, locale) }) }}</p>
        <p v-if="customName" class="muted small link">{{ linkFor(custom) }}</p>
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
              <td class="grow"><strong>{{ withSpouse(g.name, g.spouse, locale) }}</strong><p class="muted small link">{{ linkFor(g) }}</p></td>
              <td>
                <div class="row-actions">
                  <button type="button" class="btn btn-ghost btn-sm" @click="copy(g)">{{ t('common.copy') }}</button>
                  <button v-if="canShare" type="button" class="btn btn-ghost btn-sm" @click="share(g)">{{ t('admin.invitations.share') }}</button>
                  <button type="button" class="btn btn-ghost btn-sm" @click="qrFor = g">{{ t('admin.invitations.qr') }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <AdminModal :open="!!qrFor" :title="`${t('admin.invitations.qr')}: ${qrFor ? withSpouse(qrFor.name, qrFor.spouse, locale) : ''}`" @close="qrFor = null">
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
.spouse { display: flex; flex-wrap: wrap; gap: var(--space-2) var(--space-4); }
.qr-box { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); }
.url { word-break: break-all; text-align: center; }
</style>
