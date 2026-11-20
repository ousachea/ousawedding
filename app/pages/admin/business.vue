<script setup lang="ts">
// The business page at the site root (not one couple's invitation): your name, a few words, and how
// couples can reach you. Saved to content/site.json; it goes live when pushed, like the invitations.
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const api = useAdminApi()
const { push } = useToasts()

const site = ref<SiteInfo | null>(null)
onMounted(async () => { site.value = await api<SiteInfo>('/api/admin/site') })
const field = (key: 'tagline' | 'about') => computed<Localized>({
  get: () => site.value![key],
  set: v => (site.value![key] = v),
})
const tagline = field('tagline')
const about = field('about')

const saving = ref(false)
async function save() {
  if (!site.value || saving.value) return
  saving.value = true
  try {
    site.value = await api<SiteInfo>('/api/admin/site', { method: 'PUT', body: site.value })
    push(t('common.saved'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-page">
    <header class="page-head">
      <div>
        <h1>{{ t('admin.business.title') }}</h1>
        <p class="muted">{{ t('admin.business.hint') }}</p>
      </div>
      <a href="/" target="wedding-invitation" class="btn btn-ghost">{{ t('admin.business.view') }} ↗</a>
    </header>

    <form v-if="site" class="form-grid business" @submit.prevent="save">
      <section class="panel form-grid">
        <div class="field">
          <label for="b-name">{{ t('admin.business.name') }}</label>
          <input id="b-name" v-model="site.name" maxlength="80" required>
        </div>
        <AdminLocalizedField v-model="tagline" :label="t('admin.business.tagline')" />
        <AdminLocalizedField v-model="about" :label="t('admin.business.about')" multiline />
      </section>

      <section class="panel form-grid">
        <h2>{{ t('admin.business.contact') }}</h2>
        <p class="hint">{{ t('admin.business.contactHint') }}</p>
        <div class="form-grid cols-2">
          <div class="field">
            <label for="b-telegram">{{ t('admin.business.telegram') }}</label>
            <input id="b-telegram" v-model="site.telegram" maxlength="33" placeholder="@username" autocapitalize="off">
          </div>
          <div class="field">
            <label for="b-phone">{{ t('admin.business.phone') }}</label>
            <input id="b-phone" v-model="site.phone" type="tel" maxlength="40">
          </div>
          <div class="field">
            <label for="b-facebook">{{ t('admin.business.facebook') }}</label>
            <input id="b-facebook" v-model="site.facebook" type="url" placeholder="https://facebook.com/…">
          </div>
          <div class="field">
            <label for="b-email">{{ t('admin.business.email') }}</label>
            <input id="b-email" v-model="site.email" type="email">
          </div>
        </div>
      </section>

      <div><button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button></div>
    </form>
    <p v-else class="muted">{{ t('common.loading') }}</p>
  </div>
</template>

<style scoped>
.business { max-width: 52rem; }
.panel h2 { font-size: 1.3rem; }
</style>
