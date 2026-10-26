<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, wedding, loadWedding, loadList } = useCurrentWedding()
const { me } = useAdminSession()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()
const config = useRuntimeConfig().public

const DEFAULT_THEME: ThemeConfig = { background: '#F5F0F6', accent: '#C9A24A', secondary: '#5B2A86', tertiary: '#2D1640', text: '#2A1F33', headingFont: 'serif', motif: 'lotus' }
const timezones = Intl.supportedValuesOf?.('timeZone') ?? ['Asia/Phnom_Penh']

// Editable copy of the wedding; saved as one PATCH
type Draft = Omit<Wedding, 'id' | 'createdAt' | 'updatedAt' | 'isSample'>
const draft = ref<Draft | null>(null)
watch(wedding, (w) => {
  if (!w) return
  const { id: _id, createdAt: _c, updatedAt: _u, isSample: _s, ...rest } = structuredClone(toRaw(w))
  draft.value = rest
}, { immediate: true })

const saving = ref(false)
async function save() {
  if (!draft.value || saving.value) return
  saving.value = true
  try {
    await api(base.value, { method: 'PATCH', body: draft.value })
    await Promise.all([loadWedding(), loadList()])
    push(t('common.saved'))
  } finally {
    saving.value = false
  }
}

const loc = (key: 'message' | 'story') => computed<Localized>({
  get: () => ({ km: draft.value!.content.km[key], en: draft.value!.content.en[key] }),
  set: (v) => {
    draft.value!.content.km[key] = v.km
    draft.value!.content.en[key] = v.en
  },
})
const message = loc('message')
const story = loc('story')
const nameField = (key: 'partner1' | 'partner2') => computed<Localized>({
  get: () => ({ km: draft.value!.names.km[key], en: draft.value!.names.en[key] }),
  set: (v) => {
    draft.value!.names.km[key] = v.km
    draft.value!.names.en[key] = v.en
  },
})
const partner1 = nameField('partner1')
const partner2 = nameField('partner2')
const shareField = (key: 'title' | 'description') => computed<Localized>({
  get: () => ({ km: draft.value!.share.km[key], en: draft.value!.share.en[key] }),
  set: (v) => {
    draft.value!.share.km[key] = v.km
    draft.value!.share.en[key] = v.en
  },
})
const shareTitle = shareField('title')
const shareDescription = shareField('description')

const themeStyle = computed(() => draft.value && ({
  '--c-bg': draft.value.theme.background,
  '--c-accent': draft.value.theme.accent,
  '--c-secondary': draft.value.theme.secondary,
  '--c-tertiary': draft.value.theme.tertiary,
  '--c-text': draft.value.theme.text,
  '--font-heading': draft.value.theme.headingFont === 'sans' ? 'var(--font-sans)' : 'var(--font-serif)',
}))
const colorKeys = ['background', 'accent', 'secondary', 'tertiary', 'text'] as const

// Admin access (Firebase only)
const admins = ref<Admin[]>([])
const newAdmin = reactive({ email: '', role: 'editor' as AdminRole })
async function loadAdmins() {
  if (me.value?.role === 'owner') admins.value = await api<Admin[]>(`${base.value}/admins`)
}
watch(base, loadAdmins, { immediate: true })
async function addAdmin() {
  await api(`${base.value}/admins`, { method: 'POST', body: newAdmin })
  newAdmin.email = ''
  push(t('common.saved'))
  await loadAdmins()
}
async function removeAdmin(a: Admin) {
  if (!await confirm(t('admin.settings.removeAdminConfirm', { email: a.email }), { action: t('admin.settings.removeAdmin') })) return
  await api(`${base.value}/admins/${a.id}`, { method: 'DELETE' })
  await loadAdmins()
}
</script>

<template>
  <div v-if="draft" class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.settings') }}</h1>
      <button type="submit" form="settings-form" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
    </div>

    <form id="settings-form" class="sections" @submit.prevent="save">
      <section class="panel form-grid">
        <h2>{{ t('admin.settings.couple') }}</h2>
        <AdminLocalizedField v-model="partner1" :label="t('admin.settings.partner1')" required />
        <AdminLocalizedField v-model="partner2" :label="t('admin.settings.partner2')" required />
        <div class="form-grid cols-3">
          <div class="field">
            <label for="s-mono">{{ t('admin.settings.monogram') }}</label>
            <input id="s-mono" v-model="draft.monogram" maxlength="12">
          </div>
          <div class="field">
            <label for="s-date">{{ t('admin.settings.date') }}</label>
            <input id="s-date" v-model="draft.date" type="datetime-local" required>
          </div>
          <div class="field">
            <label for="s-tz">{{ t('admin.settings.timezone') }}</label>
            <select id="s-tz" v-model="draft.timezone">
              <option v-for="tz in timezones" :key="tz" :value="tz">{{ tz }}</option>
            </select>
          </div>
        </div>
        <div class="field">
          <label for="s-slug">{{ t('admin.settings.slug') }}</label>
          <input id="s-slug" v-model="draft.slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" required>
          <p class="hint">/wedding/{{ draft.slug }}</p>
        </div>
      </section>

      <section class="panel form-grid">
        <h2>{{ t('admin.settings.content') }}</h2>
        <AdminLocalizedField v-model="message" :label="t('admin.settings.message')" multiline />
        <AdminLocalizedField v-model="story" :label="t('admin.settings.story')" multiline />
        <div class="field">
          <label for="s-cover">{{ t('admin.settings.cover') }}</label>
          <input id="s-cover" v-model="draft.coverImage">
          <p class="hint">{{ t('admin.settings.coverHint') }}</p>
        </div>
        <div class="field">
          <label for="s-lang">{{ t('admin.settings.language') }}</label>
          <select id="s-lang" v-model="draft.defaultLocale">
            <option value="km">{{ t('common.khmer') }}</option>
            <option value="en">{{ t('common.english') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="s-music">{{ t('admin.settings.music') }}</label>
          <input id="s-music" v-model="draft.musicUrl" type="url">
        </div>
      </section>

      <section class="panel form-grid">
        <h2>{{ t('admin.settings.theme') }}</h2>
        <div class="theme">
          <div class="form-grid">
            <div class="colors">
              <div v-for="key in colorKeys" :key="key" class="field color">
                <label :for="`c-${key}`">{{ t(`admin.settings.${key}`) }}</label>
                <input :id="`c-${key}`" v-model="draft.theme[key]" type="color">
              </div>
            </div>
            <div class="form-grid cols-2">
              <div class="field">
                <label for="s-font">{{ t('admin.settings.headingFont') }}</label>
                <select id="s-font" v-model="draft.theme.headingFont">
                  <option value="serif">{{ t('admin.settings.fonts.serif') }}</option>
                  <option value="sans">{{ t('admin.settings.fonts.sans') }}</option>
                </select>
              </div>
              <div class="field">
                <label for="s-motif">{{ t('admin.settings.motif') }}</label>
                <select id="s-motif" v-model="draft.theme.motif">
                  <option v-for="m in (['lotus', 'kbach', 'none'] as const)" :key="m" :value="m">{{ t(`admin.settings.motifs.${m}`) }}</option>
                </select>
              </div>
            </div>
            <div><button type="button" class="btn btn-ghost btn-sm" @click="draft.theme = { ...DEFAULT_THEME }">{{ t('admin.settings.resetTheme') }}</button></div>
          </div>
          <!-- Live preview of the theme before saving -->
          <div class="theme-preview themed" :style="themeStyle" aria-hidden="true">
            <WeddingOrnament :motif="draft.theme.motif" kind="flower" />
            <p class="tp-names">{{ draft.names.en.partner1 }} &amp; {{ draft.names.en.partner2 }}</p>
            <WeddingOrnament :motif="draft.theme.motif" />
            <span class="btn btn-primary btn-sm">RSVP</span>
            <div class="tp-band">12 · 05 · 30</div>
          </div>
        </div>
      </section>

      <section class="panel form-grid">
        <h2>{{ t('admin.settings.rsvp') }}</h2>
        <div class="field">
          <label for="s-deadline">{{ t('admin.invitations.deadline') }}</label>
          <input id="s-deadline" v-model="draft.rsvp.deadline" type="datetime-local" required>
        </div>
        <label class="check"><input v-model="draft.rsvp.allowUpdates" type="checkbox"> {{ t('admin.settings.allowUpdates') }}</label>
        <label class="check"><input v-model="draft.rsvp.askDietary" type="checkbox"> {{ t('admin.settings.askDietary') }}</label>
        <label class="check"><input v-model="draft.rsvp.allowGeneral" type="checkbox"> {{ t('admin.settings.allowGeneral') }}</label>
        <div v-if="draft.rsvp.allowGeneral" class="field narrow">
          <label for="s-gmax">{{ t('admin.settings.generalMax') }}</label>
          <input id="s-gmax" v-model.number="draft.rsvp.generalMaxAttendees" type="number" min="1" max="20">
        </div>
        <h2>{{ t('admin.settings.privacy') }}</h2>
        <label class="check"><input v-model="draft.privacy.allowIndexing" type="checkbox"> {{ t('admin.settings.allowIndexing') }}</label>
      </section>

      <section class="panel form-grid">
        <h2>{{ t('admin.settings.contact') }}</h2>
        <div class="form-grid cols-3">
          <div class="field">
            <label for="s-cname">{{ t('admin.settings.contactName') }}</label>
            <input id="s-cname" v-model="draft.contact.name" maxlength="120">
          </div>
          <div class="field">
            <label for="s-cphone">{{ t('admin.settings.contactPhone') }}</label>
            <input id="s-cphone" v-model="draft.contact.phone" type="tel" maxlength="40">
          </div>
          <div class="field">
            <label for="s-cemail">{{ t('admin.settings.contactEmail') }}</label>
            <input id="s-cemail" v-model="draft.contact.email" type="email">
          </div>
        </div>
        <h2>{{ t('admin.settings.share') }}</h2>
        <AdminLocalizedField v-model="shareTitle" :label="t('admin.settings.shareTitle')" />
        <AdminLocalizedField v-model="shareDescription" :label="t('admin.settings.shareDescription')" multiline />
      </section>

      <div><button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button></div>
    </form>

    <section v-if="me?.role === 'owner' && config.driver === 'firebase'" class="panel form-grid">
      <h2>{{ t('admin.settings.admins') }}</h2>
      <ul class="admins">
        <li v-for="a in admins" :key="a.id">
          <span>{{ a.email }} · {{ t(`admin.settings.roles.${a.role}`) }}<template v-if="a.weddingIds.includes('*')"> · *</template></span>
          <button v-if="a.id !== me.id && !a.weddingIds.includes('*')" type="button" class="btn btn-danger btn-sm" @click="removeAdmin(a)">{{ t('admin.settings.removeAdmin') }}</button>
        </li>
      </ul>
      <form class="add-admin" @submit.prevent="addAdmin">
        <div class="field">
          <label for="a-email">{{ t('admin.settings.adminEmail') }}</label>
          <input id="a-email" v-model="newAdmin.email" type="email" required>
        </div>
        <div class="field">
          <label for="a-role">{{ t('admin.settings.role') }}</label>
          <select id="a-role" v-model="newAdmin.role">
            <option value="editor">{{ t('admin.settings.roles.editor') }}</option>
            <option value="owner">{{ t('admin.settings.roles.owner') }}</option>
          </select>
        </div>
        <button type="submit" class="btn btn-outline">{{ t('admin.settings.addAdmin') }}</button>
      </form>
    </section>

    <section v-if="me?.role === 'owner'" class="panel form-grid">
      <h2>{{ t('admin.settings.backup') }}</h2>
      <p class="muted small">{{ t('admin.settings.backupHint') }}</p>
      <div><a :href="`${base}/backup`" class="btn btn-outline" download>{{ t('admin.settings.downloadBackup') }}</a></div>
      <p class="muted small">{{ t('admin.settings.version') }}: {{ config.version || '–' }}<template v-if="config.commit"> ({{ config.commit }})</template></p>
    </section>
  </div>
</template>

<style scoped>
.sections { display: flex; flex-direction: column; gap: var(--space-5); }
.panel h2 { font-size: 1.3rem; }
.narrow { max-width: 14rem; }
.theme { display: grid; gap: var(--space-5); }
@media (min-width: 900px) { .theme { grid-template-columns: 1fr 18rem; } }
.colors { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); }
.color input[type='color'] { padding: 2px; height: 44px; cursor: pointer; }
.theme-preview { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); padding: var(--space-5); border-radius: var(--radius); background: var(--c-bg); color: var(--c-text); border: 1px solid var(--c-line); }
.tp-names { font-family: var(--font-heading); font-size: 1.6rem; text-align: center; }
.tp-band { width: 100%; padding: var(--space-2); text-align: center; border-radius: var(--radius-sm); background: var(--c-tertiary); color: #fff; font-family: var(--font-serif); }
.admins { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.admins li { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); }
.add-admin { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-end; }
.add-admin .field { flex: 1 1 12rem; }
</style>
