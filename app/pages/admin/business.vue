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

// Prices: empty boxes are saved as no price (null), not 0
const num = (v: string) => (v.trim() === '' ? null : Number(v))
function setAddon(key: HomeFeature, on: boolean) {
  site.value!.pricing.addons[key] = on ? { usd: null, khr: null } : null
}

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
      <a href="/" target="wedding-invitation" class="btn btn-ghost">{{ t('admin.business.view') }} <WeddingIcon name="out" /></a>
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

      <section class="panel form-grid">
        <h2>{{ t('admin.business.prices') }}</h2>
        <p class="hint">{{ t('admin.business.pricesHint') }}</p>
        <fieldset class="price-row">
          <legend>{{ t('admin.business.base') }}</legend>
          <label>$ <input class="input" type="number" min="0" step="any" inputmode="decimal" :value="site.pricing.base.usd ?? ''" @input="site.pricing.base.usd = num(($event.target as HTMLInputElement).value)"></label>
          <label>៛ <input class="input" type="number" min="0" step="any" inputmode="numeric" :value="site.pricing.base.khr ?? ''" @input="site.pricing.base.khr = num(($event.target as HTMLInputElement).value)"></label>
        </fieldset>
        <fieldset v-for="key in HOME_FEATURES" :key="key" class="price-row">
          <legend>{{ t(`home.features.${key}.title`) }}</legend>
          <select class="input" :value="site.pricing.addons[key] ? 'addon' : 'included'" :aria-label="t(`home.features.${key}.title`)" @change="setAddon(key, ($event.target as HTMLSelectElement).value === 'addon')">
            <option value="included">{{ t('home.included') }}</option>
            <option value="addon">{{ t('admin.business.addon') }}</option>
          </select>
          <template v-if="site.pricing.addons[key]">
            <label>+ $ <input class="input" type="number" min="0" step="any" inputmode="decimal" :value="site.pricing.addons[key]!.usd ?? ''" @input="site.pricing.addons[key]!.usd = num(($event.target as HTMLInputElement).value)"></label>
            <label>+ ៛ <input class="input" type="number" min="0" step="any" inputmode="numeric" :value="site.pricing.addons[key]!.khr ?? ''" @input="site.pricing.addons[key]!.khr = num(($event.target as HTMLInputElement).value)"></label>
          </template>
        </fieldset>
      </section>

      <div><button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button></div>
    </form>
    <p v-else class="muted">{{ t('common.loading') }}</p>
  </div>
</template>

<style scoped>
.business { max-width: 52rem; }
.panel h2 { font-size: 1.3rem; }
.price-row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-4); border: 0; border-top: 1px solid var(--c-line-soft); margin: 0; padding: var(--space-3) 0 0; }
.price-row legend { float: left; width: 100%; padding: 0; margin-bottom: var(--space-2); font-weight: 500; }
.price-row label { display: inline-flex; align-items: center; gap: var(--space-2); }
.price-row input { width: 8rem; }
.price-row select { width: auto; }
</style>
