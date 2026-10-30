<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
const { t } = useI18n()
const { base, wedding, loadWedding } = useCurrentWedding()
const api = useAdminApi()
const { push } = useToasts()

const DEFAULT_THEME: ThemeConfig = { background: '#F5F0F6', accent: '#C9A24A', secondary: '#5B2A86', tertiary: '#2D1640', text: '#2A1F33', headingFont: 'serif', motif: 'lotus', style: 'classic' }
// Choosing a style also applies its colours (still editable below)
const STYLE_THEMES: Record<WeddingStyle, ThemeConfig> = {
  classic: DEFAULT_THEME,
  floral: { background: '#F7F5F2', accent: '#9F86C9', secondary: '#7D5BAA', tertiary: '#5A4675', text: '#3A3242', headingFont: 'serif', motif: 'none', style: 'floral' },
}
// Fonts are not part of a style, so they are kept
const setStyle = (s: WeddingStyle) => (theme.value = { ...STYLE_THEMES[s], fontEn: theme.value?.fontEn, fontKm: theme.value?.fontKm })
// Every choice is loaded here so each sample shows in its own font
useHead({ link: [{ rel: 'stylesheet', href: fontsHref([...FONTS_EN, ...FONTS_KM]) }] })

const colorKeys = ['background', 'accent', 'secondary', 'tertiary', 'text'] as const

// Editable copy of the theme; the preview shows the saved wedding wearing it
const theme = ref<ThemeConfig | null>(null)
watch(wedding, (w) => { if (w) theme.value = structuredClone(toRaw(w).theme) }, { immediate: true })
const previewDraft = computed(() => wedding.value && theme.value && { ...wedding.value, theme: theme.value })

const saving = ref(false)
async function save() {
  if (!theme.value || saving.value) return
  saving.value = true
  try {
    await api(base.value, { method: 'PATCH', body: { theme: theme.value } })
    await loadWedding()
    push(t('common.saved'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="theme" class="admin-page">
    <div class="page-head">
      <h1>{{ t('admin.nav.theme') }}</h1>
      <button type="submit" form="theme-form" class="btn btn-primary" :disabled="saving">{{ saving ? t('common.saving') : t('common.save') }}</button>
    </div>
    <div class="editor">
      <AdminPreview :draft="previewDraft" section="home" />
      <form id="theme-form" @submit.prevent="save">
        <section class="panel form-grid">
          <div class="theme">
            <div class="form-grid">
              <div class="field">
                <label for="s-style">{{ t('admin.settings.style') }}</label>
                <select id="s-style" :value="theme.style ?? 'classic'" @change="setStyle(($event.target as HTMLSelectElement).value as WeddingStyle)">
                  <option value="classic">{{ t('admin.settings.styles.classic') }}</option>
                  <option value="floral">{{ t('admin.settings.styles.floral') }}</option>
                </select>
                <p class="hint">{{ t('admin.settings.styleHint') }}</p>
              </div>
              <div class="colors">
                <div v-for="key in colorKeys" :key="key" class="field color">
                  <label :for="`c-${key}`">{{ t(`admin.settings.${key}`) }}</label>
                  <input :id="`c-${key}`" v-model="theme[key]" type="color">
                </div>
              </div>
              <div class="form-grid cols-2">
                <div class="field">
                  <label for="s-font">{{ t('admin.settings.headingFont') }}</label>
                  <select id="s-font" v-model="theme.headingFont">
                    <option value="serif">{{ t('admin.settings.fonts.serif') }}</option>
                    <option value="sans">{{ t('admin.settings.fonts.sans') }}</option>
                  </select>
                </div>
                <div class="field">
                  <label for="s-font-en">{{ t('admin.settings.fontEn') }}</label>
                  <select id="s-font-en" v-model="theme.fontEn">
                    <option value="">{{ t('admin.settings.fontDefault', { name: 'Cormorant Garamond' }) }}</option>
                    <option v-for="f in FONTS_EN" :key="f" :value="f">{{ f }}</option>
                  </select>
                  <p class="font-sample" :style="{ fontFamily: `'${theme.fontEn || 'Cormorant Garamond'}', serif` }">{{ wedding?.names.en.partner1 }} &amp; {{ wedding?.names.en.partner2 }}</p>
                </div>
                <div class="field">
                  <label for="s-font-km">{{ t('admin.settings.fontKm') }}</label>
                  <select id="s-font-km" v-model="theme.fontKm">
                    <option value="">{{ t('admin.settings.fontDefault', { name: 'Noto Serif Khmer' }) }}</option>
                    <option v-for="f in FONTS_KM" :key="f" :value="f">{{ f }}</option>
                  </select>
                  <p class="font-sample" lang="km" :style="{ fontFamily: `'${theme.fontKm || 'Noto Serif Khmer'}', serif` }">{{ wedding?.names.km.partner1 }} និង {{ wedding?.names.km.partner2 }}</p>
                </div>
                <div class="field">
                  <label for="s-motif">{{ t('admin.settings.motif') }}</label>
                  <select id="s-motif" v-model="theme.motif">
                    <option v-for="m in (['lotus', 'kbach', 'none'] as const)" :key="m" :value="m">{{ t(`admin.settings.motifs.${m}`) }}</option>
                  </select>
                </div>
              </div>
              <div><button type="button" class="btn btn-ghost btn-sm" @click="theme = { ...DEFAULT_THEME }">{{ t('admin.settings.resetTheme') }}</button></div>
            </div>
          </div>
        </section>
      </form>
    </div>
  </div>
</template>

<style scoped>
.editor { display: grid; gap: var(--space-5); align-items: start; }
@media (min-width: 1100px) {
  .editor { grid-template-columns: minmax(0, 1fr) 380px; }
  .preview { grid-column: 2; grid-row: 1; }
}
.font-sample { margin-top: var(--space-1); font-size: 1.6rem; line-height: 1.4; }
.colors { display: grid; gap: var(--space-3); grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr)); }
.color input[type='color'] { padding: 2px; cursor: pointer; }
</style>
