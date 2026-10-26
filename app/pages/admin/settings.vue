<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, wedding, loadWedding, loadList } = useCurrentWedding()
const { me } = useAdminSession()
const api = useAdminApi()
const { push } = useToasts()
const { confirm } = useConfirm()
const config = useRuntimeConfig().public


// Editable copy of the wedding; saved as one PATCH
type Draft = Omit<Wedding, 'id' | 'createdAt' | 'updatedAt' | 'isSample'>
const draft = ref<Draft | null>(null)
watch(wedding, (w, old) => {
  if (!w) return
  // The big day was saved from the sidebar: take the moved dates, keep unsaved edits here
  if (draft.value && old?.id === w.id && old.date !== w.date) {
    draft.value.date = w.date
    draft.value.rsvp.deadline = w.rsvp.deadline
    return
  }
  const { id: _id, createdAt: _c, updatedAt: _u, isSample: _s, ...rest } = structuredClone(toRaw(w))
  // Times are entered in the admin's own timezone, taken from the browser
  draft.value = { ...rest, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || rest.timezone }
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

const loc = (key: 'message' | 'story' | 'thanks' | 'apology') => computed<Localized>({
  get: () => ({ km: draft.value!.content.km[key], en: draft.value!.content.en[key] }),
  set: (v) => {
    draft.value!.content.km[key] = v.km
    draft.value!.content.en[key] = v.en
  },
})
const message = loc('message')
const story = loc('story')
const thanks = loc('thanks')
const apology = loc('apology')
const textFields = { story, thanks, apology }
const textLabel = { story: 'admin.settings.story', thanks: 'admin.settings.thanks', apology: 'admin.settings.apology' } as const
const textOrder = computed(() => draft.value!.textOrder ?? [...TEXT_BLOCKS])
function moveText(i: number, by: -1 | 1) {
  const order = [...textOrder.value]
  ;[order[i], order[i + by]] = [order[i + by]!, order[i]!]
  draft.value!.textOrder = order
}
const nameField = (key: 'partner1' | 'partner2' | 'parents1' | 'parents2') => computed<Localized>({
  get: () => ({ km: draft.value!.names.km[key], en: draft.value!.names.en[key] }),
  set: (v) => {
    draft.value!.names.km[key] = v.km
    draft.value!.names.en[key] = v.en
  },
})
const partner1 = nameField('partner1')
const partner2 = nameField('partner2')
const parents1 = nameField('parents1')
const parents2 = nameField('parents2')
const shareField = (key: 'title' | 'description') => computed<Localized>({
  get: () => ({ km: draft.value!.share.km[key], en: draft.value!.share.en[key] }),
  set: (v) => {
    draft.value!.share.km[key] = v.km
    draft.value!.share.en[key] = v.en
  },
})
const shareTitle = shareField('title')
const shareDescription = shareField('description')

// The section of the invitation the preview scrolls to, following what is being edited
const previewSection = ref('home')
</script>

<template>
  <div v-if="draft" class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.settings') }}</h1>
      <button type="submit" form="settings-form" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
    </div>

    <div class="editor">
    <AdminPreview :draft="draft" :section="previewSection" />

    <form id="settings-form" class="sections" @submit.prevent="save">
      <section class="panel form-grid" @focusin="previewSection = 'home'">
        <h2>{{ t('admin.settings.couple') }}</h2>
        <AdminLocalizedField v-model="partner1" :label="t('admin.settings.partner1')" required />
        <AdminLocalizedField v-model="partner2" :label="t('admin.settings.partner2')" required />
        <AdminLocalizedField v-model="parents1" :label="t('admin.settings.parentsOf', { name: draft.names.en.partner1 })" multiline />
        <AdminLocalizedField v-model="parents2" :label="t('admin.settings.parentsOf', { name: draft.names.en.partner2 })" multiline />
        <div class="field">
          <label for="s-mono">{{ t('admin.settings.monogram') }}</label>
          <input id="s-mono" v-model="draft.monogram" maxlength="12">
        </div>
        <div class="field">
          <label for="s-slug">{{ t('admin.settings.slug') }}</label>
          <input id="s-slug" v-model="draft.slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" required>
          <p class="hint">/{{ draft.slug }}</p>
        </div>
      </section>

      <section class="panel form-grid" @focusin="previewSection = 'home'">
        <h2>{{ t('admin.settings.content') }}</h2>
        <AdminLocalizedField v-model="message" :label="t('admin.settings.message')" multiline />
        <!-- Shown on the page in this order -->
        <div v-for="(key, i) in textOrder" :key="key" class="text-block" @focusin.stop="previewSection = key">
          <AdminLocalizedField :model-value="textFields[key].value" :label="t(textLabel[key])" multiline @update:model-value="textFields[key].value = $event" />
          <div class="move">
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === 0" :aria-label="`${t('admin.settings.moveUp')}: ${t(textLabel[key])}`" @click="moveText(i, -1)">↑</button>
            <button type="button" class="btn btn-ghost btn-sm" :disabled="i === textOrder.length - 1" :aria-label="`${t('admin.settings.moveDown')}: ${t(textLabel[key])}`" @click="moveText(i, 1)">↓</button>
          </div>
        </div>
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

      <section class="panel form-grid" @focusin="previewSection = 'rsvp'">
        <h2>{{ t('admin.settings.rsvp') }}</h2>
        <div class="field">
          <label for="s-deadline">{{ t('admin.invitations.deadline') }}</label>
          <input id="s-deadline" v-model="draft.rsvp.deadline" type="datetime-local" required>
        </div>
        <div class="field">
          <label for="s-form">{{ t('admin.settings.rsvpForm') }}</label>
          <input id="s-form" v-model="draft.rsvp.formUrl" type="url" placeholder="https://forms.gle/…">
          <p class="hint">{{ t('admin.settings.rsvpFormHint') }}</p>
        </div>
        <h2>{{ t('admin.settings.privacy') }}</h2>
        <label class="check"><input v-model="draft.privacy.allowIndexing" type="checkbox"> {{ t('admin.settings.allowIndexing') }}</label>
      </section>

      <section class="panel form-grid" @focusin="previewSection = 'contact'">
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
    </div>


    <section class="panel form-grid">
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
.text-block { position: relative; }
.move { position: absolute; top: -0.4rem; right: 0; display: flex; gap: var(--space-1); }
.editor { display: grid; gap: var(--space-5); align-items: start; }
@media (min-width: 1100px) {
  .editor { grid-template-columns: minmax(0, 1fr) 380px; }
  .preview { grid-column: 2; grid-row: 1; }
}
</style>
